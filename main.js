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

document.addEventListener('DOMContentLoaded', async () => {
  const searchParams = new URLSearchParams(window.location.search);

  const elNewsListHolder = document.querySelector('#news-list-holder');
  if (elNewsListHolder !== null) {
    const newsList = await client.getList({
      endpoint: 'news',
    });

    const elNewsListItemTemplate = document.querySelector('#news-list-item-template');

    newsList.contents.forEach((content) => {
      const elNewsListItem = elNewsListItemTemplate.content.cloneNode(true);
      elNewsListItem.querySelector('.js-title').textContent = content.title;
      elNewsListItem.querySelector('.js-published_at').textContent = content.publishedAt;
      elNewsListItem.querySelector('.js-thumbnail').setAttribute('src', content.thumbnail.url);
      elNewsListItem.querySelector('.js-link').setAttribute('href', '?news_id=' + content.id);
      elNewsListHolder.appendChild(elNewsListItem);
    });
  }

  const elNewsDetailHolder = document.querySelector('#news-detail-holder');
  const newsId = searchParams.get('news_id');
  if (elNewsDetailHolder !== null && newsId !== null) {
    const newsDetail = await client.getListDetail({
      endpoint: 'news',
      contentId: newsId,
    });

    const elNewsDetailTemplate = document.querySelector('#news-detail-template');
    const elNewsDetail = elNewsDetailTemplate.content.cloneNode(true);
    elNewsDetail.querySelector('.js-category').textContent = newsDetail.category[0];
    elNewsDetail.querySelector('.js-title').textContent = newsDetail.title;
    elNewsDetail.querySelector('.js-published_at').textContent = newsDetail.publishedAt;
    elNewsDetail.querySelector('.js-thumbnail').setAttribute('src', newsDetail.thumbnail.url);
    elNewsDetail.querySelector('.js-related-link').innerHTML = "<a href=\"" + newsDetail.related_link.url + "\">" + newsDetail.related_link.title + "</a>";
    elNewsDetailHolder.appendChild(elNewsDetail);
  }

  const elNewsSearchResultHolder = document.querySelector('#news-search-result-holder');
  const title = searchParams.get('title');
  if (elNewsSearchResultHolder !== null && title !== null) {
    const newsSearchResultList = await client.getAllContents({
      endpoint: 'news',
      queries: {
        filters: 'title[contains]' + title
      }
    });

    const elNewsSearchResultItemTemplate = document.querySelector('#news-search-result-item-template');

    newsSearchResultList.forEach((newsDetail) => {
      const elNewsSearchResultItem = elNewsSearchResultItemTemplate.content.cloneNode(true);
      elNewsSearchResultItem.querySelector('.js-title').textContent = newsDetail.title;
      elNewsSearchResultItem.querySelector('.js-published_at').textContent = newsDetail.publishedAt;
      elNewsSearchResultItem.querySelector('.js-thumbnail').setAttribute('src', newsDetail.thumbnail.url);
      elNewsSearchResultItem.querySelector('.js-link').setAttribute('href', '?news_id=' + newsDetail.id);
      elNewsSearchResultHolder.appendChild(elNewsSearchResultItem);
    });
  }
});
