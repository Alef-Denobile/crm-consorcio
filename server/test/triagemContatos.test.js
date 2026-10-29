const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { montarMensagensDoPossivel } = require('../utils/triagemContatos');

describe('triagem de contatos — conversa do contato vira histórico do cliente', () => {
  test('WhatsApp: cada mensagem guardada vira uma mensagem recebida do cliente', () => {
    const possivel = { origem: 'whatsapp', mensagens: [
      { texto: 'Oi, queria saber de consórcio', timestamp: new Date('2026-10-29T10:00:00Z'), whatsappMessageId: 'wamid.1' },
      { texto: '📷 Foto', timestamp: new Date('2026-10-29T10:01:00Z'), whatsappMessageId: 'wamid.2', midiaTipo: 'image' },
    ] };
    const docs = montarMensagensDoPossivel(possivel, 'card1', 'user1');
    assert.equal(docs.length, 2);
    assert.ok(docs.every((d) => d.direction === 'in' && d.canal === 'whatsapp' && d.cardId === 'card1' && d.userId === 'user1'));
    assert.equal(docs[0].whatsappMessageId, 'wamid.1');
    assert.equal(docs[1].midiaTipo, 'image');
  });
  test('Instagram: canal e id da mensagem do Instagram', () => {
    const docs = montarMensagensDoPossivel({ origem: 'instagram', mensagens: [{ texto: 'Olá', instagramMessageId: 'mid.9' }] }, 'c', 'u');
    assert.equal(docs[0].canal, 'instagram');
    assert.equal(docs[0].instagramMessageId, 'mid.9');
  });
  test('registro de planilha (sem mensagens) não gera nada', () => {
    assert.deepEqual(montarMensagensDoPossivel({ origem: 'planilha', mensagens: [] }, 'c', 'u'), []);
    assert.deepEqual(montarMensagensDoPossivel({ origem: 'planilha' }, 'c', 'u'), []);
  });
});
