"use strict";
exports.__esModule = true;
var http_1 = require("http");
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
var Status;
(function (Status) {
    Status[Status["IDLE"] = 0] = "IDLE";
    Status[Status["MATCHMAKING"] = 1] = "MATCHMAKING";
    Status[Status["INGAME"] = 2] = "INGAME";
})(Status || (Status = {}));
var parties = new Map();
var players = new Map();
var notifications = new Map();
function getNotification(job) {
    var notif = notifications.get(job);
    notifications.set(job, []);
    return notif;
}
function addNotificationForJob(job, newnotif) {
    var existing = notifications.get(job);
    if (existing) {
        existing.push(newnotif);
    }
    else {
        notifications.set(job, [newnotif]);
    }
}
function createParty(player, jobid, partyid) {
    parties.set(partyid, { jobid: jobid, partyid: partyid, players: [player], outstanding: [] });
}
function removePlayerFromParty(player, partyid) {
    var party = parties.get(partyid);
    if (party) {
        party.players = party.players.filter(function (p) { return p !== player; });
        if (party.players.length === 0) {
            parties["delete"](partyid);
        }
    }
}
function setPlayerParty(player, party) {
    var playerdata = players.get(player);
    if (playerdata.partyid !== '') {
        removePlayerFromParty(player, playerdata.partyid);
    }
    var partyobj = parties.get(party);
    if (partyobj) {
        partyobj.outstanding = partyobj.outstanding.filter(function (p) { return p !== player; });
    }
    players.get(player).partyid = party;
}
function playerJoined(player, jobid) {
    playerLeft(player); // TODO: refactor.
    players.set(player, { jobid: jobid, partyid: '', status: Status.IDLE });
}
function playerLeft(player) {
    // TODO: remember what game a player was in.
    removePlayerFromParty(player, players.get(player).partyid);
    players["delete"](player);
}
function invitePlayer(player, partyid) {
    var _a;
    var party = parties.get(partyid);
    if (party) {
        party.outstanding.push(player);
        addNotificationForJob((_a = players.get(player)) === null || _a === void 0 ? void 0 : _a.jobid, { partyid: partyid, player: player });
    }
}
function handleError(e, res) {
    console.log(e);
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid JSON');
}
function partyEnterMatchmaking(jobid, partyid) {
}
function handleRequest(req, res, data) {
    switch (req.url) {
        case '/party/find':
            partyEnterMatchmaking(data.jobid, data.partyid);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
            break;
        case '/party/create':
            console.log("Worked.");
            createParty(data.player, data.jobid, data.partyid);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
            break;
        case '/party/join':
            setPlayerParty(data.player, data.partyid);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
            break;
        case '/party/leave':
            setPlayerParty(data.player, '');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
            break;
        case '/live/invite':
            invitePlayer(data.player, data.partyid);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
            break;
        case '/live/tick':
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(getNotification(data.jobid)));
            break;
        case '/live/join':
            playerJoined(data.player, data.jobid);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
    }
}
(0, http_1.createServer)(function (req, res) {
    console.log("Received.");
    // get full request data
    var data = '';
    req.on('data', function (chunk) {
        data += chunk;
    });
    req.on('end', function () {
        console.log(data);
        handleRequest(req, res, JSON.parse(data));
    });
}).listen(8080);
