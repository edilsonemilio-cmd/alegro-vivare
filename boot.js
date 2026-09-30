(function () {
  var orig = window.fetch;
  window.fetch = function (url, opt) {
    var u = typeof url === "string" ? url : "";
    if (u.indexOf("/rest/v1/estado") === -1) return orig.apply(this, arguments);
    var method = (opt && opt.method) || "GET";
    if (method === "PATCH" && opt && opt.body) {
      try {
        var b = JSON.parse(opt.body);
        if (b.payload) b.payload.session = null;
        opt = Object.assign({}, opt, { body: JSON.stringify(b) });
      } catch (e) {}
      return orig.call(this, url, opt);
    }
    return orig.apply(this, arguments).then(function (r) {
      return r.text().then(function (t) {
        try {
          var rows = JSON.parse(t);
          if (Array.isArray(rows) && rows[0] && rows[0].payload) rows[0].payload.session = null;
          t = JSON.stringify(rows);
        } catch (e) {}
        return new Response(t, { status: r.status, headers: { "Content-Type": "application/json" } });
      });
    });
  };
})();
