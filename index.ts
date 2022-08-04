import { createServer } from 'http'
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

enum Status {
    IDLE,
    MATCHMAKING,
    INGAME
}

enum PacketType {
    INVITE,
    ACCEPT_INVITE,
    DECLINE_INVITE,
    PATCH_GROUP
}

type PartySettings = {
    open: boolean,
    mode: Gamemode
}

enum Gamemode {
    SPICE,
    CAPTURE,
    DEATHMATCH
}

type PartyData = { jobid: string, partyid: string, players: string[], outstanding: string[], settings: PartySettings };
type PlayerData = { jobid: string, partyid: string, status: Status };

type PartyUpdate = { pack: PacketType, partyid: string, players: string[], settings: PartySettings };
type PartyInvite = { pack: PacketType, partyid: string, player: string };

let parties = new Map<string, PartyData>();
let players = new Map<string, PlayerData>();
let notifications = new Map<string, (PartyUpdate | PartyInvite)[]>();

function getNotification(job) {
    let notif = notifications.get(job);
    notifications.set(job, []);
    return notif || [];
}

function addNotificationForJob(job, newnotif: PartyUpdate | PartyInvite) {
    let existing = notifications.get(job);
    if (existing) {
        existing.push(newnotif);
    } else {
        notifications.set(job, [newnotif]);
    }
}

function createParty(player: string, jobid: string, partyid: string) {
    parties.set(partyid, { jobid, partyid, players: [player], outstanding: [], settings: { mode: Gamemode.SPICE, open: true } });
}

function removePlayerFromParty(player: string, partyid: string) {
    let party = parties.get(partyid);
    if (party) {
        party.players = party.players.filter(p => p !== player);
        if (party.players.length === 0) {
            parties.delete(partyid);
        }
    }
}

function setPlayerParty(player: string, party: string) {
    let playerdata = players.get(player) as PlayerData;
    if (playerdata.partyid !== '') {
        removePlayerFromParty(player, playerdata.partyid);
    }
    let partyobj = parties.get(party);
    console.log("Fetched party.");
    if (partyobj) {
        console.log("Added player to party.")
        partyobj.outstanding = partyobj.outstanding.filter(p => p !== player);
        playerdata.partyid = party;
        addNotificationForJob(partyobj.jobid, { pack: PacketType.PATCH_GROUP, partyid: party, players: partyobj?.outstanding, settings: partyobj.settings });
        addNotificationForJob(playerdata.jobid, { pack: PacketType.PATCH_GROUP, partyid: party, players: partyobj?.outstanding, settings: partyobj.settings });
    } else return;

}

function playerJoined(player: string, jobid: string) {
    // playerLeft(player); // TODO: refactor.
    players.set(player, { jobid, partyid: '', status: Status.IDLE });
}

function playerLeft(player: string) {
    // TODO: remember what game a player was in.
    removePlayerFromParty(player, (players.get(player) as PlayerData).partyid);
    players.delete(player);
}

function invitePlayer(player: string, partyid: string) {
    let party = parties.get(partyid);
    if (party) {
        party.outstanding.push(player);
        addNotificationForJob(players.get(player)?.jobid, { pack: PacketType.INVITE, partyid, player });
    }
}

function handleError(e, res) {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.end('Invalid JSON');
}

function partyEnterMatchmaking(jobid: string, partyid: string) {

}

function handleRequest(req, res, data) {
    switch (req.url) {
        case '/party/find':
            partyEnterMatchmaking(data.jobid, data.partyid);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end();
            break;
        case '/party/create':
            createParty(data.player, data.jobid, data.partyid);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end();
            break;
        case '/party/join':
            setPlayerParty(data.player, data.partyid);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end();
            break;
        case '/party/leave':
            setPlayerParty(data.player, '');
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end();
            break;
        case '/live/invite':
            invitePlayer(data.player, data.partyid);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end();
            break;
        case '/live/tick':
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(getNotification(data.jobid)));
            break;
        case '/live/join':
            playerJoined(data.player, data.jobid);
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end();
            break;
        default:
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end();
    }
}

createServer(function (req, res) {
    // get full request data
    let data = '';
    req.on('data', function (chunk) {
        data += chunk;
    });
    req.on('end', function () {
        handleRequest(req, res, JSON.parse(data));
    });
}).listen(80);

