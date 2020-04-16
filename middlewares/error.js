module.exports = (err, req, res, next) => {
    console.log('Error', {message: err.message, originUrl: req.originalUrl})
    res.status(err.status || 500)
    res.json({message: err.message ? err.message : 'API is not available, please try again later.'})
};
