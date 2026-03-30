'use strict';

const MAX_ITEMS = 10;
const MAX_URLS_PER_FIELD = 2;

function normalizeUrlList(value) {
  if (!value) return [];
  if (Array.isArray(value.url_list)) {
    return value.url_list.filter(Boolean).slice(0, MAX_URLS_PER_FIELD);
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean).slice(0, MAX_URLS_PER_FIELD);
  }
  return [];
}

function extractChallengeNames(challenges) {
  if (!Array.isArray(challenges)) return [];
  return challenges.map((item) => item?.cha_name).filter(Boolean).slice(0, MAX_URLS_PER_FIELD);
}

function extractChallengeShareUrls(challenges) {
  if (!Array.isArray(challenges)) return [];
  return challenges.map((item) => item?.share_url).filter(Boolean).slice(0, MAX_URLS_PER_FIELD);
}

function pickBoolean(value) {
  return typeof value === 'boolean' ? value : null;
}

function pickNumber(value) {
  return typeof value === 'number' ? value : null;
}

function pickString(value) {
  return typeof value === 'string' ? value : null;
}

function flattenBusinessItem(item) {
  const aweme = item?.data?.aweme_info;
  if (!aweme || typeof aweme !== 'object') {
    return null;
  }

  const author = aweme.author || {};
  const music = aweme.music || {};
  const video = aweme.video || {};
  const statistics = aweme.statistics || {};
  const status = aweme.status || {};
  const challengeList = Array.isArray(aweme.cha_list) ? aweme.cha_list : [];

  return {
    type: pickNumber(item?.type),
    aweme_id: pickString(aweme.aweme_id),
    desc: pickString(aweme.desc),
    author_uid: pickString(author.uid),
    author_nickname: pickString(author.nickname),
    author_is_verified: pickBoolean(author.is_verified),
    author_region: pickString(author.region || aweme.region),
    author_avatar_thumb_urls: normalizeUrlList(author.avatar_thumb),
    author_avatar_medium_urls: normalizeUrlList(author.avatar_medium),
    author_avatar_larger_urls: normalizeUrlList(author.avatar_larger),
    music_id: pickString(music.id_str || String(music.id || '')) || null,
    music_title: pickString(music.title),
    music_author: pickString(music.author),
    music_play_urls: normalizeUrlList(music.play_url),
    cha_names: extractChallengeNames(challengeList),
    cha_share_urls: extractChallengeShareUrls(challengeList),
    video_play_urls: normalizeUrlList(video.play_addr),
    video_cover_urls: normalizeUrlList(video.cover),
    video_dynamic_cover_urls: normalizeUrlList(video.dynamic_cover || video.animated_cover),
    video_origin_cover_urls: normalizeUrlList(video.origin_cover),
    video_download_urls: normalizeUrlList(video.download_addr),
    video_width: pickNumber(video.width),
    video_height: pickNumber(video.height),
    video_ratio: pickString(video.ratio),
    video_duration: pickNumber(video.duration || aweme.duration),
    comment_count: pickNumber(statistics.comment_count),
    digg_count: pickNumber(statistics.digg_count),
    share_count: pickNumber(statistics.share_count),
    play_count: pickNumber(statistics.play_count),
    collect_count: pickNumber(statistics.collect_count),
    is_delete: pickBoolean(status.is_delete),
    is_private: pickBoolean(status.is_private),
    allow_share:
      pickBoolean(status.allow_share) ??
      pickBoolean(aweme.aweme_control?.can_share),
    allow_comment:
      pickBoolean(status.allow_comment) ??
      pickBoolean(aweme.aweme_control?.can_comment),
    share_url: pickString(aweme.share_url)
  };
}

function flattenTikHubResponse(source) {
  const responseData = source?.data && typeof source.data === 'object' ? source.data : {};
  const businessData = Array.isArray(responseData.business_data)
    ? responseData.business_data.slice(0, MAX_ITEMS)
    : [];

  return {
    code: source?.code ?? 200,
    message: source?.message ?? '',
    message_zh: source?.message_zh ?? '',
    request_id: source?.request_id ?? null,
    router: source?.router ?? null,
    time: source?.time ?? null,
    time_stamp: source?.time_stamp ?? null,
    time_zone: source?.time_zone ?? null,
    docs: source?.docs ?? null,
    cache_url: source?.cache_url ?? null,
    cache_message: source?.cache_message ?? null,
    cache_message_zh: source?.cache_message_zh ?? null,
    support: source?.support ?? null,
    cursor: pickNumber(responseData.cursor),
    search_id: pickString(responseData.search_id),
    backtrace: pickString(responseData.backtrace),
    has_more: pickNumber(responseData.has_more),
    keyword: pickString(responseData.keyword),
    items: businessData.map(flattenBusinessItem).filter(Boolean),
    raw_meta: {
      business_data_count: businessData.length,
      item_limit: MAX_ITEMS,
      url_limit_per_field: MAX_URLS_PER_FIELD
    }
  };
}

module.exports = {
  flattenTikHubResponse
};
