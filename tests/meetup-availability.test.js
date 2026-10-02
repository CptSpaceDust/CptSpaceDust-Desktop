const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { transformSync } = require("esbuild");

function loadData(availability) {
  let inserted = false;
  const calls = [];
  const supabase = {
    from(table) {
      let filters = [], insert = false;
      return {
        select(){return this},
        eq(key,value){filters.push([key,value]);return this},
        in(){return this}, limit(){return this}, maybeSingle(){return this}, single(){return this},
        insert(){insert=true;inserted=true;return this},
        then(resolve) {
          calls.push({table,filters});
          const result = insert ? {data:{id:"new"}} : filters.some(([k,v])=> k==="status" && v==="approved") ? availability : {data:null};
          return Promise.resolve(result).then(resolve);
        },
      };
    },
    functions:{invoke:async()=>({error:null})},
  };
  const module = {exports:{}};
  const code = transformSync(fs.readFileSync(require.resolve("../src/renderer/lib/data.js"),"utf8"),{format:"cjs"}).code;
  vm.runInNewContext(code,{module,exports:module.exports,require:()=>({supabase})});
  return {create:module.exports.createMeetup,calls,inserted:()=>inserted};
}
test("meetup submission rejects occupied dates before inserting", async()=>{
  const data = loadData({data:[{id:"booked"}]});
  await assert.rejects(data.create("crew",{meetup_date:"2026-10-28",start_time:"19:00"}),/already occupied/);
  assert.equal(data.inserted(),false);
  assert.deepEqual(JSON.parse(JSON.stringify(data.calls[0].filters)),[["meetup_date","2026-10-28"],["status","approved"]]);
});
test("meetup availability errors fail closed without inserting",async()=>{
  const data = loadData({error:new Error("Unable to check availability")});
  await assert.rejects(data.create("crew",{meetup_date:"2026-10-28"}),/Unable to check/);
  assert.equal(data.inserted(),false);
});
test("available dates continue through request creation",async()=>{
  const data = loadData({data:[]});
  const result = await data.create("crew",{meetup_date:"2026-10-29",start_time:"19:00"});
  assert.equal(result.emailSent,true);
  assert.equal(data.inserted(),true);
});
