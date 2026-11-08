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
        fcntl.ioctl(stdin, termios.TIOCSWINSZ, size)
        try:
            os.execvp("agy", ["agy", *args])
        except FileNotFoundError:
            sys.exit("Antigravity CLI (agy) must be available on PATH.")

    def resize(_signum, _frame):
        current = fcntl.ioctl(stdin, termios.TIOCGWINSZ, bytes(8))
        fcntl.ioctl(master, termios.TIOCSWINSZ, current)

    def terminate(signum, _frame):
        try:
            os.kill(child, signum)
        except ProcessLookupError:
            pass

    signal.signal(signal.SIGWINCH, resize)
    signal.signal(signal.SIGTERM, terminate)
    signal.signal(signal.SIGINT, terminate)
    tty.setraw(stdin)
    deadline = time.monotonic() + 15
    agent = args[args.index("--agent") + 1].encode()
    header = b""
    prompt_open = False
    mcp_open = False
    ready_at = None
    submitted = False
    startup_failed = False
    try:
        while True:
            sources, _, _ = select.select([master, stdin], [], [], None if submitted else 0.05)
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
                    header = (header + output)[-4096:]
                    prompt_open = agent in header and b"? for shortcuts" in header
            if stdin in sources:
                data = os.read(stdin, 65536)
                if not data:
                    break
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
        _, status = os.waitpid(child, 0)
    if startup_failed:
        sys.exit("Agy-Squad: the dispatcher was not discovered within 15 seconds.")
    code = os.waitstatus_to_exitcode(status)
    return 128 - code if code < 0 else code


if __name__ == "__main__":
    sys.exit(run(sys.argv[1], sys.argv[2], sys.argv[3:]))
