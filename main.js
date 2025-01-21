import { createClient } from 'microcms-js-sdk';

const client = createClient({
  serviceDomain: 'xxxxx', // NOTE: YOUR_DOMAIN is the XXXX part of XXXX.microcms.io
  apiKey: 'dH9tnKbLqzRZwuU7o503lCd6oPeBVlyeThn6', // NOTE: https://xxxxx.microcms.io/api-keys
  retry: true, // Retry attempts up to a maximum of two times.
});

// https://www.npmjs.com/package/microcms-js-sdk

client.getList({
  endpoint: 'news',
}).then((res) => {
  console.log('getList successfully.');
  console.log(res);
}).catch((err) => {
  console.log('getList failed');
  console.error(err);
});

client.getListDetail({
  endpoint: 'news',
  contentId: 'ot5ejzyxbc',
}).then((res) => {
  console.log('getListDetail successfully.');
  console.log(res);
}).catch((err) => {
  console.log('getListDetail failed');
  console.error(err);
});

client.getAllContentIds({
  endpoint: 'news',
}).then((res) => {
  console.log('getAllContentIds successfully.');
  console.log(res);
}).catch((err) => {
  console.log('getAllContentIds failed');
  console.error(err);
});

client.getAllContents({
  endpoint: 'news',
}).then((res) => {
  console.log('getAllContents successfully.');
  console.log(res);
}).catch((err) => {
  console.log('getAllContents failed');
  console.error(err);
});
