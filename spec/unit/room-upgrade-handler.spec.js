const { RoomUpgradeHandler } = require("../../lib/components/room-upgrade-handler");
const { expect } = require('chai');

describe("RoomUpgradeHandler", () => {
    describe("constructor", () => {
        it("should construct", () => {
            const ruh = new RoomUpgradeHandler({isOpts: true}, {isBridge: true});
            expect(ruh.opts).to.equal({isOpts: true, migrateGhosts: true, migrateStoreEntries: true});
            expect(ruh.bridge).to.equal({isBridge: true});
            expect(ruh.waitingForInvite.size).to.equal(0);
        });
    });
    describe("onTombstone", () => {
        it("should join the new room", () => {
            let joined;
            const bridge = {
                getIntent: () => ({
                    join: (roomId) => { joined = roomId; return Promise.resolve(); },
                }),
            };
            const ruh = new RoomUpgradeHandler({}, bridge);
            ruh.onJoinedNewRoom = () => true;
            return ruh.onTombstone({
                room_id: "!abc:def",
                sender: "@foo:bar",
                content: {
                    replacement_room: "!new:def",
                }
            }).then((res) => {
                expect(joined).to.equal("!new:def");
                expect(ruh.waitingForInvite.size).to.equal(0);
                expect(res).to.equal(true);
            });
        });
        it("should wait for an invite on M_FORBIDDEN", () => {
            let joined;
            const bridge = {
                getIntent: () => ({
                    join: (roomId) => { joined = roomId; return Promise.reject({errcode: "M_FORBIDDEN"}); },
                }),
            };
            const ruh = new RoomUpgradeHandler({}, bridge);
            return ruh.onTombstone({
                room_id: "!abc:def",
                sender: "@foo:bar",
                content: {
                    replacement_room: "!new:def",
                }
            }).then((res) => {
                expect(joined).to.equal("!new:def");
                expect(ruh.waitingForInvite.size).to.equal(1);
                expect(res).to.equal(true);
            });
        });
        it("should do nothing on failure", () => {
            let joined;
            const bridge = {
                getIntent: () => ({
                    join: (roomId) => { joined = roomId; return Promise.reject({}); },
                }),
            };
            const ruh = new RoomUpgradeHandler({}, bridge);
            ruh.onJoinedNewRoom = () => true;
            return ruh.onTombstone({
                room_id: "!abc:def",
                sender: "@foo:bar",
                content: {
                    replacement_room: "!new:def",
                }
            }).then((res) => {
                expect(joined).to.equal("!new:def");
                expect(ruh.waitingForInvite.size).to.equal(0);
                expect(res).to.equal(false);
            });
        });
    });
    describe("_joinNewRoom", () => {
        it("should join a room successfully", () => {
            let joined;
            const bridge = {
                getIntent: () => ({
                    join: (roomId) => { joined = roomId; return Promise.resolve({}); },
                }),
            };
            const ruh = new RoomUpgradeHandler({}, bridge);
            return ruh.joinNewRoom("!new:def", "!new:def").then((res) => {
                expect(res).to.equal(true);
                expect(joined).to.equal("!new:def");
            });
        });
        it("should return false on M_FORBIDDEN", () => {
            let joined;
            const bridge = {
                getIntent: () => ({
                    join: (roomId) => { joined = roomId; return Promise.reject({errcode: "M_FORBIDDEN"}); },
                }),
            };
            const ruh = new RoomUpgradeHandler({}, bridge);
            return ruh.joinNewRoom("!new:def").then((res) => {
                expect(joined).to.equal("!new:def");
                expect(res).to.equal(false);
            });
        });
        it("should fail for any other reason", () => {
            const bridge = {
                getIntent: () => ({
                    join: (roomId) => { return Promise.reject({}); },
                }),
            };
            const ruh = new RoomUpgradeHandler({}, bridge);
            return ruh.joinNewRoom("!new:def", "!new:def").catch((err) => {
                expect(err.message).to.equal("Failed to handle upgrade");
            });
        });
    });
    describe("onInvite", () => {
        it("should not handle a unexpected invite", async () => {
            const ruh = new RoomUpgradeHandler({}, {});
            expect(await ruh.onInvite({
                room_id: "!abc:def",
            })).to.equal(false);
        });
        it("should handle a expected invite", async (done) => {
            const ruh = new RoomUpgradeHandler({}, {});
            let newRoomId = false;
            ruh.waitingForInvite.set("!new:def", "!abc:def");
            ruh.joinNewRoom = (_newRoomId) => {
                newRoomId = _newRoomId;
                return Promise.resolve();
            }
            ruh.onJoinedNewRoom = () => {
                expect(newRoomId).to.equal("!new:def");
                done();
            }
            expect(await ruh.onInvite({
                room_id: "!new:def",
            })).to.equal(true);
        });
    });
});
