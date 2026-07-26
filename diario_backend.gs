/**
 * DIÁRIO COMPARTILHADO · ROUTE 66 · FAMÍLIA VOLTAS
 * ================================================
 * Este script recebe os relatos do app e devolve todos juntos,
 * para que os quatro vejam o diário um do outro.
 *
 * COMO INSTALAR (uma vez só)
 * 1. Abra a sua planilha do roteiro no Google Sheets
 * 2. Extensões » Apps Script
 * 3. Cole este código num arquivo novo (ou junto do gerador)
 * 4. Salve
 * 5. Implantar » Nova implantação » tipo "App da Web"
 *    - Executar como: Eu mesmo
 *    - Quem tem acesso: QUALQUER PESSOA
 * 6. Copie o link que termina em /exec e me mande — vai no app
 *
 * O script cria sozinho uma aba chamada DIARIO na primeira vez.
 */

var ABA_DIARIO = 'DIARIO';

function _abaDiario() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ABA_DIARIO);
  if (!sh) {
    sh = ss.insertSheet(ABA_DIARIO);
    sh.appendRow(['dia', 'pessoa', 'texto', 'momento', 'osmo', 'audio', 'nota', 'atualizado']);
    sh.getRange('A1:H1').setFontWeight('bold').setBackground('#2C3E50').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Resposta JSON com cabeçalho que libera o app a chamar (CORS). */
function _json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** GET — o app pede todos os relatos. */
function doGet(e) {
  try {
    var sh = _abaDiario();
    var v = sh.getDataRange().getValues();
    var out = [];
    for (var i = 1; i < v.length; i++) {
      if (String(v[i][0]) === '') continue;
      out.push({
        dia: Number(v[i][0]),
        pessoa: String(v[i][1]),
        texto: String(v[i][2]),
        momento: String(v[i][3]),
        osmo: String(v[i][4]),
        audio: String(v[i][5]),
        nota: Number(v[i][6]) || 0,
        atualizado: String(v[i][7])
      });
    }
    return _json({ ok: true, relatos: out });
  } catch (err) {
    return _json({ ok: false, erro: String(err) });
  }
}

/** POST — o app envia um relato (cria ou atualiza o daquela pessoa+dia). */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(8000);
    var d = JSON.parse(e.postData.contents);
    if (!d.pessoa || !d.dia) return _json({ ok: false, erro: 'faltam dados' });

    var sh = _abaDiario();
    var v = sh.getDataRange().getValues();
    var linha = -1;
    for (var i = 1; i < v.length; i++) {
      if (Number(v[i][0]) === Number(d.dia) && String(v[i][1]) === String(d.pessoa)) {
        linha = i + 1; break;
      }
    }
    var agora = new Date().toISOString();
    var dados = [Number(d.dia), String(d.pessoa), String(d.texto || ''),
                 String(d.momento || ''), String(d.osmo || ''), String(d.audio || ''),
                 Number(d.nota) || 0, agora];
    if (linha === -1) sh.appendRow(dados);
    else sh.getRange(linha, 1, 1, 8).setValues([dados]);

    return _json({ ok: true, atualizado: agora });
  } catch (err) {
    return _json({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}
