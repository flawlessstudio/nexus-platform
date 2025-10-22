export const budget={
  day:new Date().toDateString(), used:0,
  roll(){const d=new Date().toDateString(); if(d!==this.day){this.day=d; this.used=0}},
  take(n=1){this.roll(); this.used+=n},
  ok(limit){this.roll(); return this.used<limit}
};
