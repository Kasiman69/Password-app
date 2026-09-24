import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createAutoLock,LOCK_DELAY_MS} from '../lib/auto-lock.ts';
function setup(){let time=0,locks=0;const timer=createAutoLock(()=>locks++,()=>time);return {timer,advance:n=>time+=n,locks:()=>locks};}
test('returning just before five minutes keeps the vault unlocked',()=>{const s=setup();s.advance(240000);s.timer.leave();s.advance(LOCK_DELAY_MS-1);s.timer.resume();assert.equal(s.locks(),0);s.advance(1000);s.timer.check();assert.equal(s.locks(),0);});
test('exactly five minutes away locks even if timers were suspended',()=>{const s=setup();s.timer.leave();s.advance(LOCK_DELAY_MS);s.timer.resume();assert.equal(s.locks(),1);s.timer.check();assert.equal(s.locks(),1);});
test('duplicate pagehide events do not restart the away period',()=>{const s=setup();s.timer.leave();s.advance(200000);s.timer.leave();s.advance(100000);s.timer.resume();assert.equal(s.locks(),1);});
test('foreground inactivity still locks and a late interaction cannot bypass expiry',()=>{const s=setup();s.advance(LOCK_DELAY_MS);assert.equal(s.timer.activity(),true);assert.equal(s.locks(),1);s.timer.reset();s.advance(LOCK_DELAY_MS-1);s.timer.activity();s.advance(2);s.timer.check();assert.equal(s.locks(),1);});
test('separate short trips each get a fresh away period',()=>{const s=setup();s.timer.leave();s.advance(200000);s.timer.resume();s.timer.leave();s.advance(200000);s.timer.resume();assert.equal(s.locks(),0);});
