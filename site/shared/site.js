/** Locale preference for `/` redirect + language switcher. */
(function () {
  var KEY = "proman_locale";
  document.querySelectorAll("[data-set-locale]").forEach(function (el) {
    el.addEventListener("click", function () {
      var locale = el.getAttribute("data-set-locale");
      if (locale === "de" || locale === "en") {
        try {
          localStorage.setItem(KEY, locale);
        } catch (e) { /* ignore */ }
      }
    });
  });
})();
