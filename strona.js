// Obsługa strony: czyta formularz, liczy (kalkulator.js), pokazuje wynik, nabory i kontakt.
(function () {
  var zl = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0, useGrouping: 'always' });
  var MIESIACE = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var ostatniWynik = null;

  function etykietaPremii(kod) {
    return '+' + BAZA.kryteria[kod].wartosc + ' p.p.';
  }

  function data(iso) {
    var d = iso.split('-');
    return { dzien: +d[2], miesiac: MIESIACE[+d[1] - 1], rok: d[0] };
  }

  function zakres(od, doDnia) {
    var a = data(od), b = data(doDnia);
    if (a.miesiac === b.miesiac) return a.dzien + '–' + b.dzien + ' ' + b.miesiac + ' ' + b.rok;
    return a.dzien + ' ' + a.miesiac + ' – ' + b.dzien + ' ' + b.miesiac + ' ' + b.rok;
  }

  function rysujUczestnikow() {
    var lista = $('#uczestnicy');
    var liczba = Math.max(1, Math.min(50, parseInt($('#liczba').value, 10) || 1));
    while (lista.children.length < liczba) {
      var nr = lista.children.length + 1;
      var li = document.createElement('li');
      li.innerHTML = '<span>Osoba ' + nr + '</span>' +
        '<label><input type="checkbox" value="premia_55plus">55+</label>' +
        '<label><input type="checkbox" value="premia_niepelnosprawnosc">z niepełnosprawnością</label>';
      lista.appendChild(li);
    }
    while (lista.children.length > liczba) lista.removeChild(lista.lastChild);
  }

  function wejscie() {
    var zaznaczone = function (s) { return $$(s).filter(function (i) { return i.checked && i.value; })
      .map(function (i) { return i.value; }); };
    return {
      wielkosc: $('input[name=wielkosc]:checked').value,
      premieFirmy: zaznaczone('input[name=firma]').concat(zaznaczone('input[name=restrukturyzacja]')),
      premieUslugi: zaznaczone('input[name=usluga]'),
      cenaNetto: Math.max(0, parseFloat($('#cena').value) || 0),
      uczestnicy: $$('#uczestnicy li').map(function (li) {
        var zaznaczoneOsoby = Array.prototype.slice.call(li.querySelectorAll('input:checked'));
        return { premie: zaznaczoneOsoby.map(function (i) { return i.value; }) };
      }),
    };
  }

  function pokazWynik() {
    rysujUczestnikow();
    var w = policz(BAZA, wejscie());
    ostatniWynik = w;
    var procenty = w.uczestnicy.map(function (u) { return u.procent; });
    var min = Math.min.apply(null, procenty), max = Math.max.apply(null, procenty);
    $('#w-procent').textContent = min === max ? min + '%' : min + '–' + max + '%';
    $('#w-dofinansowanie').textContent = zl.format(w.dofinansowanie);
    $('#w-wklad').textContent = zl.format(w.wkladWlasny);
    $('#w-wartosc').textContent = zl.format(w.wartosc);

    var uwagi = [];
    if (w.uczestnicy.some(function (u) { return u.procentBezLimitu > u.procent; })) {
      uwagi.push('Premie przekraczają ' + BAZA.kryteria.poziom_maksymalny.wartosc + '% — więcej nie da się dostać.');
    }
    if (w.uczestnicy.some(function (u) { return u.obcietyLimitem; })) {
      uwagi.push('Dofinansowanie na osobę obcięte do ' + zl.format(BAZA.kryteria.limit_usluga_uczestnik.wartosc) +
        ' (limit na jedno szkolenie).');
    }
    if (w.obcietyLimitemFirmy) uwagi.push('Obcięte do limitu firmy w projekcie: ' + zl.format(w.limitFirmy) + '.');
    uwagi.push(w.punkty ? 'Punkty w rankingu: ' + w.punkty + ' — wniosek z punktami jest wyżej na liście.'
      : 'Punkty w rankingu: 0. Punkty dają kwalifikacja (30) i osoba 55+ (4) — wnioski z punktami są wyżej na liście.');
    uwagi.push('VAT firma wpłaca operatorowi jako depozyt — wraca po rozliczeniu.');
    $('#w-uwagi').innerHTML = uwagi.map(function (u) { return '<li>' + u + '</li>'; }).join('');

    $('#w-wiecej').hidden = w.brakujacePremie.length === 0;
    $('#w-brakujace').innerHTML = w.brakujacePremie.map(function (p) {
      return '<li><b>+' + p.wartosc + ' p.p.</b> ' + p.opis + '</li>';
    }).join('');
  }

  function pokazNabory() {
    var dzis = new Date().toISOString().slice(0, 10);
    var nadchodzace = BAZA.nabory.filter(function (n) { return n.do >= dzis; })
      .sort(function (a, b) { return a.od < b.od ? -1 : 1; });
    if (!nadchodzace.length) {
      $('#lista-naborow').innerHTML = '<li>Brak ogłoszonych naborów — zapytaj o najbliższy termin.</li>';
      return;
    }
    $('#lista-naborow').innerHTML = nadchodzace.map(function (n) {
      var op = BAZA.operatorzy[n.operator];
      var trwa = n.od <= dzis ? ' <span class="znacznik">trwa</span>' : '';
      var pula = n.pula ? zl.format(n.pula) : 'pula: na stronie operatora';
      return '<li><span class="termin">' + zakres(n.od, n.do) + trwa + '</span>' +
        '<a href="' + n.link + '" target="_blank" rel="noopener">' + op.nazwa + '</a>' +
        '<span class="pula">' + pula + ' · sprawdzono ' + n.sprawdzono + '</span></li>';
    }).join('');
  }

  function podsumowanie() {
    var w = ostatniWynik, we = wejscie();
    var nazwy = function (kody) { return kody.map(function (k) { return BAZA.kryteria[k].opis; }).join('; ') || 'brak'; };
    return [
      'Wielkość: ' + we.wielkosc, 'Premie firmy: ' + nazwy(we.premieFirmy),
      'Premie szkolenia: ' + nazwy(we.premieUslugi), 'Cena netto/os.: ' + zl.format(we.cenaNetto),
      'Uczestników: ' + we.uczestnicy.length + ' (z premią osobową: ' +
        we.uczestnicy.filter(function (u) { return u.premie.length; }).length + ')',
      'Wynik: ' + $('#w-procent').textContent + ', dofinansowanie ' + zl.format(w.dofinansowanie) +
        ', punkty ' + w.punkty,
    ].join('\n');
  }

  function wyslij(e) {
    e.preventDefault();
    var f = e.target, status = $('#formularz-status');
    if (f.www.value) return;
    if (!USTAWIENIA.formularzUrl) {
      status.textContent = 'Formularz jeszcze nie działa — napisz na adres ze stopki.';
      return;
    }
    var dane = new URLSearchParams({ imie: f.imie.value, stanowisko: f.stanowisko.value,
      telefon: f.telefon.value, mail: f.mail.value, wynik: podsumowanie() });
    status.textContent = 'Wysyłam…';
    fetch(USTAWIENIA.formularzUrl, { method: 'POST', mode: 'no-cors', body: dane })
      .then(function () { f.reset(); status.textContent = 'Dziękuję! Odezwę się najpóźniej w następny dzień roboczy.'; })
      .catch(function () { status.textContent = 'Nie udało się wysłać — napisz na adres ze stopki.'; });
  }

  function stopka() {
    var u = USTAWIENIA, czesci = [];
    if (u.autor) czesci.push(u.autor);
    if (u.mail) czesci.push('<a href="mailto:' + u.mail + '">' + u.mail + '</a>');
    if (u.telefon) czesci.push('<a href="tel:' + u.telefon.replace(/\s/g, '') + '">' + u.telefon + '</a>');
    $('#stopka-kontakt').innerHTML = czesci.join(' · ');
    $('#data-sprawdzenia').textContent = BAZA.data_sprawdzenia;
    if (u.cloudflareToken) {
      var s = document.createElement('script');
      s.defer = true; s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      s.dataset.cfBeacon = JSON.stringify({ token: u.cloudflareToken });
      document.body.appendChild(s);
    }
  }

  $$('[data-premia]').forEach(function (el) { el.textContent = etykietaPremii(el.dataset.premia); });
  $$('[data-pokaz-kontakt]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('#formularz').hidden = false;
      $('#kontakt').scrollIntoView({ behavior: 'smooth' });
      $('#formularz input[name=imie]').focus({ preventScroll: true });
    });
  });
  $('#kalkulator').addEventListener('input', pokazWynik);
  $('#formularz').addEventListener('submit', wyslij);
  pokazWynik();
  pokazNabory();
  stopka();
})();
