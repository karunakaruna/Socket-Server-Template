module.exports = {
    root: '.',  // Serve from project root
    open: true,
    injectBody: true,
    navigate: true,
    host: '0.0.0.0',
    mount: {
        '/': './public',           // Serve public files at root
        '/coretex': './coretex/static'  // Serve coretex files at /coretex
    }
};
