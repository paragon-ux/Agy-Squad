"""Pass through the native TUI and submit its initial prompt after MCP discovery."""

import errno
import fcntl
import os
import pty
import select
import signal
import sys
import termios
import time
import tty


def run(ready_file, prompt, args):
    stdin, stdout = sys.stdin.fileno(), sys.stdout.fileno()
    original = termios.tcgetattr(stdin)
    size = fcntl.ioctl(stdin, termios.TIOCGWINSZ, bytes(8))
    child, master = pty.fork()
    if child == 0:
        for sig in (signal.SIGHUP, signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, signal.SIG_DFL)
        fcntl.ioctl(stdin, termios.TIOCSWINSZ, size)
        try:
            os.execvp("agy", ["agy", *args])
        except OSError:
            sys.exit("Antigravity CLI (agy) must be available on PATH.")

    terminating = False
    wake_r, wake_w = os.pipe()
    os.set_blocking(wake_r, False)
    os.set_blocking(wake_w, False)

    def resize(_signum, _frame):
        current = fcntl.ioctl(stdin, termios.TIOCGWINSZ, bytes(8))
        fcntl.ioctl(master, termios.TIOCSWINSZ, current)

    def terminate(signum, _frame):
        nonlocal terminating
        terminating = True
        try:
            os.kill(child, signum)
        except ProcessLookupError:
            pass
        try:
            os.write(wake_w, b"\x01")
        except OSError:
            pass

    signal.signal(signal.SIGWINCH, resize)
    signal.signal(signal.SIGTERM, terminate)
    signal.signal(signal.SIGINT, terminate)
    tty.setraw(stdin)
    startup_timeout = float(os.environ.get("AGY_SQUAD_STARTUP_TIMEOUT", "15"))
    kill_grace = float(os.environ.get("AGY_SQUAD_KILL_GRACE", "2.0"))
    deadline = time.monotonic() + startup_timeout
    agent = args[args.index("--agent") + 1].encode()
    header = b""
    seen_agent = False
    seen_shortcuts = False
    prompt_open = False
    mcp_open = False
    ready_at = None
    submitted = False
    startup_failed = False
    try:
        while not terminating:
            sources, _, _ = select.select([master, stdin, wake_r], [], [], None if submitted else 0.05)
            if wake_r in sources or terminating:
                try:
                    os.read(wake_r, 64)
                except OSError:
                    pass
                break
            if master in sources:
                try:
                    output = os.read(master, 65536)
                except OSError as error:
                    if error.errno != errno.EIO:
                        raise
                    break
                if not output:
                    break
                sys.stdout.buffer.write(output)
                sys.stdout.buffer.flush()
                if not prompt_open:
                    header = (header + output)[-16384:]
                    if not seen_agent and agent in header:
                        seen_agent = True
                    if not seen_shortcuts and b"? for shortcuts" in header:
                        seen_shortcuts = True
                    prompt_open = seen_agent and seen_shortcuts
            if stdin in sources:
                data = os.read(stdin, 65536)
                if not data:
                    break
                if not submitted:
                    if b"\x03" in data:
                        terminate(signal.SIGINT, None)
                        break
                else:
                    os.write(master, data)
            if submitted:
                continue
            now = time.monotonic()
            if prompt_open and ready_at is None:
                if os.path.isfile(ready_file):
                    if mcp_open:
                        os.write(master, b"\x1b")
                    # Let Antigravity close the panel and register the eager tool.
                    ready_at = now + 0.15
                elif not mcp_open:
                    os.write(master, b"/mcp\r")
                    mcp_open = True
            if ready_at is not None and now >= ready_at:
                with os.fdopen(os.dup(master), "wb") as terminal:
                    terminal.write(b"\x1b[200~" + prompt.encode() + b"\x1b[201~\r")
                submitted = True
            elif now >= deadline:
                startup_failed = True
                terminate(signal.SIGTERM, None)
                break
    finally:
        termios.tcsetattr(stdin, termios.TCSADRAIN, original)
        os.close(master)
        status = None
        if startup_failed or terminating:
            wait_until = time.monotonic() + kill_grace
            while time.monotonic() < wait_until:
                pid, st = os.waitpid(child, os.WNOHANG)
                if pid != 0:
                    status = st
                    break
                time.sleep(0.05)
            if status is None:
                try:
                    os.kill(child, signal.SIGKILL)
                except ProcessLookupError:
                    pass
        if status is None:
            _, status = os.waitpid(child, 0)
        os.close(wake_r)
        os.close(wake_w)
    if startup_failed:
        sys.exit(f"Agy-Squad: the dispatcher was not discovered within {startup_timeout:g} seconds.")
    code = os.waitstatus_to_exitcode(status)
    exit_code = 128 - code if code < 0 else code
    if not submitted and not terminating:
        if exit_code == 0:
            sys.exit("Agy-Squad: native CLI exited before prompt submission.")
        return exit_code
    return exit_code


if __name__ == "__main__":
    sys.exit(run(sys.argv[1], sys.argv[2], sys.argv[3:]))
