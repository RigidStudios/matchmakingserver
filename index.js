let http = require('http');

http.createServer(function (req, res) {
    // get full request data
    let data = '';
    req.on('data', function (chunk) {
        data += chunk;
    });
    req.on('end', function () {
        let parsedData = JSON.parse(data);
    });
})