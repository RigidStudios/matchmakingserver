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
var PacketType;
(function (PacketType) {
    PacketType[PacketType["INVITE"] = 0] = "INVITE";
    PacketType[PacketType["ACCEPT_INVITE"] = 1] = "ACCEPT_INVITE";
    PacketType[PacketType["DECLINE_INVITE"] = 2] = "DECLINE_INVITE";
    PacketType[PacketType["PATCH_GROUP"] = 3] = "PATCH_GROUP";
})(PacketType || (PacketType = {}));
var Gamemode;
(function (Gamemode) {
    Gamemode[Gamemode["SPICE"] = 0] = "SPICE";
    Gamemode[Gamemode["CAPTURE"] = 1] = "CAPTURE";
    Gamemode[Gamemode["DEATHMATCH"] = 2] = "DEATHMATCH";
})(Gamemode || (Gamemode = {}));
var parties = new Map();
var players = new Map();
var notifications = new Map();
function getNotification(job) {
    var notif = notifications.get(job);
    notifications.set(job, []);
    return notif || [];
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
    parties.set(partyid, { jobid: jobid, partyid: partyid, players: [player], outstanding: [], settings: { mode: Gamemode.SPICE, open: true } });
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
    console.log("Fetched party.");
    if (partyobj) {
        console.log("Added player to party.");
        partyobj.outstanding = partyobj.outstanding.filter(function (p) { return p !== player; });
        partyobj.players.push(player);
        playerdata.partyid = party;
        addNotificationForJob(partyobj.jobid, { pack: PacketType.PATCH_GROUP, partyid: party, players: partyobj.players, settings: partyobj.settings });
        addNotificationForJob(playerdata.jobid, { pack: PacketType.PATCH_GROUP, partyid: party, players: partyobj.players, settings: partyobj.settings });
    }
    else
        return;
}
function playerJoined(player, jobid) {
    // playerLeft(player); // TODO: refactor.
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
        addNotificationForJob((_a = players.get(player)) === null || _a === void 0 ? void 0 : _a.jobid, { pack: PacketType.INVITE, partyid: partyid, player: player });
    }
}
function handleError(e, res) {
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
            console.log("Answered tick.");
            break;
        case '/live/join':
            playerJoined(data.player, data.jobid);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
            break;
        default:
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end();
    }
}
(0, http_1.createServer)(function (req, res) {
    // get full request data
    var data = '';
    req.on('data', function (chunk) {
        data += chunk;
    });
    req.on('end', function () {
        handleRequest(req, res, JSON.parse(data));
    });
}).listen(80);
