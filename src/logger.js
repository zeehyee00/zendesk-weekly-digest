function timestamp() {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }); // 2026-10-12 11:10:00
}

function write(level, logFn, message, extra) {
    const line = `[${timestamp()}] [${level}] ${message}`;
    if (extra !== undefined) logFn(line, extra);
    else logFn(line);
}

export const logger = {
    info: (message, extra) => write('INFO', console.log, message, extra),
    warn: (message, extra) => write('WARN', console.warn, message, extra),
    error: (message, extra) => write('ERROR', console.error, message, extra),
};
