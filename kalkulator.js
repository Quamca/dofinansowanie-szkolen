// Liczenie dofinansowania 5.15 — bez dostępu do strony, żeby dało się testować (test_kalkulator.js).
// Wzór z regulaminu (§5–§6) i zał. 11: % uczestnika = min(80, 50 + premie firmy + premie usługi
// + premie osoby); kwota uczestnika ≤ 5 000 zł; suma ≤ limit firmy wg wielkości.

var PREMIE_WYKLUCZAJACE = {
  premia_gornicza_restrukturyzacja: 'premia_restrukturyzacja_inna',
  premia_restrukturyzacja_inna: 'premia_gornicza_restrukturyzacja',
};

var PREMIE_OSOBOWE = ['premia_55plus', 'premia_niepelnosprawnosc'];

function zaokraglij(kwota) {
  return Math.round(kwota * 100) / 100;
}

function sumaPremii(baza, kody) {
  return kody.reduce(function (suma, kod) { return suma + baza.kryteria[kod].wartosc; }, 0);
}

function policz(baza, wejscie) {
  var k = baza.kryteria;
  var maks = k.poziom_maksymalny.wartosc;
  var limitUczestnika = k.limit_usluga_uczestnik.wartosc;
  var procentWspolny = k.poziom_bazowy.wartosc + sumaPremii(baza, wejscie.premieFirmy)
    + sumaPremii(baza, wejscie.premieUslugi);

  var uczestnicy = wejscie.uczestnicy.map(function (u) {
    var bezLimitu = procentWspolny + sumaPremii(baza, u.premie);
    var procent = Math.min(maks, bezLimitu);
    var kwota = zaokraglij(wejscie.cenaNetto * procent / 100);
    return {
      procentBezLimitu: bezLimitu,
      procent: procent,
      dofinansowanie: Math.min(kwota, limitUczestnika),
      obcietyLimitem: kwota > limitUczestnika,
    };
  });

  var bezLimituFirmy = zaokraglij(uczestnicy.reduce(function (s, u) { return s + u.dofinansowanie; }, 0));
  var limitFirmy = k['limit_firma_' + wejscie.wielkosc].wartosc;
  var dofinansowanie = Math.min(bezLimituFirmy, limitFirmy);
  var wartosc = zaokraglij(wejscie.cenaNetto * uczestnicy.length);

  var punkty = 0;
  if (wejscie.premieUslugi.indexOf('premia_kwalifikacja') >= 0) punkty += k.punkty_kwalifikacja_wszyscy.wartosc;
  if (wejscie.uczestnicy.some(function (u) { return u.premie.indexOf('premia_55plus') >= 0; })) {
    punkty += k.punkty_55plus.wartosc;
  }

  var maksOsiagniety = uczestnicy.every(function (u) { return u.procent >= maks; });
  var wybrane = wejscie.premieFirmy.concat(wejscie.premieUslugi);
  var brakujacePremie = maksOsiagniety ? [] : Object.keys(k).filter(function (kod) {
    var p = k[kod];
    // premie osobowe (55+, niepełnosprawność) zależą od ludzi, nie od programu — ich nie podpowiadamy
    if (p.typ !== 'premia' || wybrane.indexOf(kod) >= 0 || PREMIE_OSOBOWE.indexOf(kod) >= 0) return false;
    return wybrane.indexOf(PREMIE_WYKLUCZAJACE[kod]) < 0;
  }).map(function (kod) { return k[kod]; });

  return {
    uczestnicy: uczestnicy,
    wartosc: wartosc,
    dofinansowanieBezLimituFirmy: bezLimituFirmy,
    dofinansowanie: dofinansowanie,
    obcietyLimitemFirmy: bezLimituFirmy > limitFirmy,
    limitFirmy: limitFirmy,
    wkladWlasny: zaokraglij(wartosc - dofinansowanie),
    punkty: punkty,
    maksOsiagniety: maksOsiagniety,
    brakujacePremie: brakujacePremie,
  };
}

if (typeof module !== 'undefined') module.exports = { policz: policz, PREMIE_WYKLUCZAJACE: PREMIE_WYKLUCZAJACE, PREMIE_OSOBOWE: PREMIE_OSOBOWE };
