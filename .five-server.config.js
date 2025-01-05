module.exports = {
    root: 'public',  // Remove the ./ to make it absolute from project root
    open: true,
    injectBody: true,
    navigate: true,
    host: '0.0.0.0',
    mount: {
        '/coretex': './coretex/static'  // Keep path relative to project root
    }
};
