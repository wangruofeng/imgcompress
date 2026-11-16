#!/usr/bin/env python3
"""Drive the optional e2e build over its local MyGo socket. Release builds omit it."""
import argparse
import base64
import json
import socket
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('method', choices=['windows', 'eval', 'capture', 'idle'])
p.add_argument('argument', nargs='?')
p.add_argument('--socket', default='/tmp/imgcompress-e2e.sock')
args = p.parse_args()
params = {}
if args.method == 'eval':
    params['script'] = Path(args.argument).read_text() if Path(args.argument).is_file() else args.argument
with socket.socket(socket.AF_UNIX) as connection:
    connection.settimeout(180)
    connection.connect(args.socket)
    stream = connection.makefile('rw')
    stream.write(json.dumps({'id': 1, 'method': args.method, 'params': params}) + '\n')
    stream.flush()
    response = json.loads(stream.readline())
if 'error' in response:
    raise SystemExit(json.dumps(response, ensure_ascii=False))
if args.method == 'capture':
    Path(args.argument).write_bytes(base64.b64decode(response['result']['png']))
    print(args.argument)
else:
    print(json.dumps(response['result'], ensure_ascii=False, indent=2))
