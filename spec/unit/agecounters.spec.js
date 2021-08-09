const AgeCounters = require("../../lib/index").PrometheusMetrics.AgeCounters;
const { expect } = require('chai');

describe("AgeCounters", function() {
    describe("constructor", function() {
        it("Can construct some counter periods by default", function() {
            for (const empty of [null, undefined]) {
                const ageCounter = new AgeCounters(empty);
                expect(ageCounter.counterPeriods).to.equal(["1h", "1d", "7d", "all"]);
                expect(ageCounter.counters.size).to.equal(4);
                const mapIter = ageCounter.counters.keys();
                expect(mapIter.next().value).to.equal(3600);
                expect(mapIter.next().value).to.equal(3600 * 24);
                expect(mapIter.next().value).to.equal(3600 * 24 * 7);
                expect(mapIter.next().value).to.equal("all");
            }
        });

        it("Can construct given counter periods", function() {
            const ageCounter = new AgeCounters(["1h", "2d", "5d", "3w"]);
            expect(ageCounter.counterPeriods).to.equal(["1h", "2d", "5d", "3w", "all"]);
            expect(ageCounter.counters.size).to.equal(5);
            const mapIter = ageCounter.counters.keys();
            expect(mapIter.next().value).to.equal(3600);
            expect(mapIter.next().value).to.equal(3600 * 24 * 2);
            expect(mapIter.next().value).to.equal(3600 * 24 * 5);
            expect(mapIter.next().value).to.equal(3600 * 24 * 7 * 3);
            expect(mapIter.next().value).to.equal("all");
        });

        it("Can construct with an empty array", function() {
            const ageCounter = new AgeCounters([]);
            expect(ageCounter.counterPeriods).to.equal(["all"]);
            expect(ageCounter.counters.size).to.equal(1);
        });
        /* eslint-disable no-new */
        it("Cannot construct with invalid period strings", function() {
            expect(() => {new AgeCounters(["cats", "dogs"]);}).to.throw();
            expect(() => {new AgeCounters(["5"]);}).to.throw();
            expect(() => {new AgeCounters(["h"]);}).to.throw();
            expect(() => {new AgeCounters(["1x"]);}).to.throw();
        });
        it("Can only construct with positive integers", function() {
            expect(() => {new AgeCounters(["-1h"]);}).to.throw();
            expect(() => {new AgeCounters(["0h"]);}).to.throw();
        });

        it("Cannot construct counter with null", function() {
            expect(() => {new AgeCounters([null]);}).to.throw();
            expect(() => {new AgeCounters([undefined]);}).to.throw();
        });
        it("Cannot repeatedbly construct counter", function() {
            let periods = ["1d", "1w", "4w"];
            new AgeCounters(periods);
            new AgeCounters(periods);
        });
        /* eslint-enable no-new */

    });

    describe("bump", function () {
        it("Bumping a small age should go in all slots", function() {
            const ageCounter = new AgeCounters(["1h", "2d", "5d"]);
            ageCounter.bump(1200);
            expect(ageCounter.counters.get(3600)).to.equal(1);
            expect(ageCounter.counters.get(3600 * 24 * 2)).to.equal(1);
            expect(ageCounter.counters.get(3600 * 24 * 5)).to.equal(1);
            expect(ageCounter.counters.get("all")).to.equal(1);
        });

        it("Bumping a middling age should only go in some", function() {
            const ageCounter = new AgeCounters(["1h", "2d", "5d"]);
            ageCounter.bump(3600 * 24 * 2);
            expect(ageCounter.counters.get(3600)).to.equal(0);
            expect(ageCounter.counters.get(3600 * 24 * 2)).to.equal(0);
            expect(ageCounter.counters.get(3600 * 24 * 5)).to.equal(1);
            expect(ageCounter.counters.get("all")).to.equal(1);
        });

        it("Bumping a large age should only go in 'all'", function() {
            const ageCounter = new AgeCounters(["1h", "2d", "5d"]);
            ageCounter.bump(1200000);
            expect(ageCounter.counters.get(3600)).to.equal(0);
            expect(ageCounter.counters.get(3600 * 24 * 2)).to.equal(0);
            expect(ageCounter.counters.get(3600 * 24 * 5)).to.equal(0);
            expect(ageCounter.counters.get("all")).to.equal(1);
        });
    })
    describe("setGauge", function () {
        it("Should appropriately report gauge contents", function() {
            const ageCounter = new AgeCounters(["1h", "2d", "5d"]);
            for (let i = 0; i < 5; i++) {
                ageCounter.bump(1200);
            }

            for (let i = 0; i < 3; i++) {
                ageCounter.bump(3600 * 24);
            }

            for (let i = 0; i < 7; i++) {
                ageCounter.bump(3600 * 24 * 7);
            }
            const gaugeContents = [];
            const mockGauge = {
                set: (labels, count) => {
                    gaugeContents.push({labels, count});
                }
            };
            ageCounter.setGauge(mockGauge, {aLabel: 42});
            expect(gaugeContents[0]).to.equal({
                labels: {
                    age: "1h",
                    aLabel: 42,
                },
                count: 5
            });
            expect(gaugeContents[1]).to.equal({
                labels: {
                    age: "2d",
                    aLabel: 42,
                },
                count: 8
            });
            expect(gaugeContents[2]).to.equal({
                labels: {
                    age: "5d",
                    aLabel: 42,
                },
                count: 8
            });
            expect(gaugeContents[3]).to.equal({
                labels: {
                    age: "all",
                    aLabel: 42,
                },
                count: 15
            });
        });
    });

});
