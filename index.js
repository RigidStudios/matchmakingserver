let http = require('http');

/*
`/party/find` uses {
    jobid: string,
    partyid: string
}

`/party/create` uses {
    player: string,
    partyid: string,
    jobid: string
}

`/party/leave` uses {
    partyid: string,
    player: string
}

`/party/join` uses {
    partyid: string,
    player: string
}

`/live/invite` uses {
    partyid: string,
    player: string
}

`/live/tick` uses {
    jobid: string
}
*/

// { [partyid: string]: string }
let parties = new Map();
let players = new Map();
let notifications = new Map();

function addNotificationForJob(job, newnotif) {
    if (notifications.get(job)) {
        notifications.get(job).push(newnotif);
    } else {
        notifications.set(job, [newnotif]);
    }
}

function setPlayerParty(player, party) {
    players.set(player, party)
}

http.createServer(function (req, res) {
    // get full request data
    let data = '';
    req.on('data', function (chunk) {
        data += chunk;
    });
    req.on('end', function () {
        // check if path is /party
        if (req.url === '/party/find') {
            try {
                let parsedData = JSON.parse(data);
                let jobid = parsedData.jobid;
                let partyid = parsedData.partyid;
            } catch (e) {
                console.log(e);
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('Invalid JSON');
                return;
            }
        } else if (req.url === '/party/create') {
            try {
                let parsedData = JSON.parse(data);
                let player = parsedData.player;
                let partyid = parsedData.partyid;
                let jobid = parsedData.jobid;

                parties.set(partyid, { jobid, partyid, players: [player] });
                if (players.get(player)) {

                }
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end({ success: true });
            } catch (e) {
                console.log(e);
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('Invalid JSON');
                return;
            }
        } else if (req.url === '/party/join') {

        } else if (req.url === '/party/leave') {

        }

    });
}).listen(80);