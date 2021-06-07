// A tiny wrapper around fetch(), borrowed from
// https://kentcdodds.com/blog/replace-axios-with-a-simple-custom-fetch-wrapper

import { settings } from '../config';

/**
 * Client I stole this form a react tutorial
 */
export async function client(endpoint, { body, ...customConfig } = {}) {
  const headers = { 'Content-Type': 'application/json' }

  // Attempt Http basic auth if we got credentials
  let authHeaders = {}
  if (settings.opencast.name && settings.opencast.password) {
    const encoded = btoa(unescape(encodeURIComponent(
      settings.opencast.name + ":" + settings.opencast.password
    )));
    authHeaders = { 'Authorization': `Basic ${encoded}` };
  }

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
      ...authHeaders,
    },
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  let data
  let text
  let response
  try {
    response = await window.fetch(endpoint, config)
    text = await response.text()

    if (response.url.includes("login.html")) {
      throw new Error("Got redirected to login page, authentification failed.")
    }

    if (response.ok) {
      text.length ? data = JSON.parse(text) : data = ''
      return data
    }
    throw new Error(response.statusText)
  } catch (err) {
    return Promise.reject(JSON.stringify({
      status: response.status,
      text: text ? text : err.message
    }))
  }
}

client.get = function (endpoint, customConfig = {}) {
  return client(endpoint, { ...customConfig, method: 'GET' })
}

client.post = function (endpoint, body, customConfig = {}) {
  return client(endpoint, { ...customConfig, body })
}