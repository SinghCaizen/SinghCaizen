/* ============================================================================
   FolioAnalytics Web Worker wrapper — "FOLIO by Singh Caizen"
   ----------------------------------------------------------------------------
   Protocol (see ANALYTICS.md):
     IN : the compute() input object directly (plain data). It may carry an
          extra `_id` field for request/response correlation; the engine
          ignores it and it is echoed back on the response.
          { cmd: "selfTest", _id } runs the self-test instead of compute().
     OUT: success -> the compute() result object (plus `_id` when one was sent)
          failure -> { error: "message" } (plus `_id` when one was sent)
   ============================================================================ */
"use strict";

importScripts("analytics.js");

self.onmessage = function (e) {
  var d = e.data || {};
  var id = d._id;
  try {
    var result;
    if (d.cmd === "selfTest") {
      result = FolioAnalytics.selfTest();
    } else {
      result = FolioAnalytics.compute(d);
    }
    if (id !== undefined) result._id = id;
    self.postMessage(result);
  } catch (err) {
    var out = { error: String((err && err.message) || err) };
    if (id !== undefined) out._id = id;
    self.postMessage(out);
  }
};
