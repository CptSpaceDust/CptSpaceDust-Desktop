// Fake read-only backend for browser regression checks. Never contacts Supabase.
const date = new Date();
const day = (n) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
let reads = 0;
const people = [{ id: "captain", username: "CptSpaceDust", rank: "Captain" }, { id: "nova", username: "Nova", rank: "Member" }, { id: "luna", username: "Luna", rank: "Member" }];
const rows = (table) => ({
  profiles: people,
  site_settings: [{ safe_mode: false }],
  meetup_requests: [{ id: "booked", user_id: "nova", meetup_date: day(28), start_time: "18:00", duration: 1, status: "approved", meetup_type: "Gaming" }],
  dm_conversations: [{ id: "dm", user_one: "nova", user_two: "luna", updated_at: new Date().toISOString() }],
  dm_messages: [
    { id: "original", sender_id: "nova", content: "*Italic* ||bold|| **both**", created_at: new Date().toISOString() },
    { id: "reply", sender_id: "luna", content: `Reply loaded on read ${reads}`, reply_to_id: "original", is_reply: true, created_at: new Date().toISOString() },
    { id: "expired", sender_id: "nova", content: "A reply to a removed message", is_reply: true, created_at: new Date().toISOString() },
  ],
}[table] || []);
export const supabase = {
  from(table) { let single = false; return {
    select(){return this}, eq(){return this}, in(){return this}, gt(){return this}, order(){return this}, limit(){return this},
    single(){single=true;return this}, maybeSingle(){single=true;return this},
    then(resolve){ reads++; return new Promise(done => setTimeout(() => done({data:single ? rows(table)[0] : rows(table),error:null}),250)).then(resolve); },
  }; },
  channel(){return {on(){return this},subscribe(){return this}}}, removeChannel(){},
  realtime:{setAuth:async()=>{}},
};
