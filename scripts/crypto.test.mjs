import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deriveKey,newSalt,seal,unseal,generatePassword,decode,encode,validateVault } from '../lib/vault-crypto.ts';
const example={version:1,entries:[{id:'test-entry',title:'Example',username:'test@example.invalid',password:'not-a-real-password',website:'https://example.invalid',notes:'private note',favorite:true,updatedAt:'2026-01-01T00:00:00Z'}]};
test('vault encryption authenticates the passphrase, owner, and ciphertext',async()=>{
 const salt=newSalt();const key=await deriveKey('a synthetic test passphrase only',salt);
 assert.equal(key.extractable,false);
 const encrypted=await seal(example,key,'owner-one');
 assert.deepEqual(await unseal(encrypted,key,'owner-one'),example);
 assert.notEqual(encrypted.iv,(await seal(example,key,'owner-one')).iv);
 assert.ok(!encrypted.ciphertext.includes('not-a-real-password'));
 await assert.rejects(()=>unseal(encrypted,key,'owner-two'));
 const wrong=await deriveKey('a different synthetic passphrase',salt);
 await assert.rejects(()=>unseal(encrypted,wrong,'owner-one'));
 const bytes=decode(encrypted.ciphertext);bytes[0]^=1;
 await assert.rejects(()=>unseal({...encrypted,ciphertext:encode(bytes)},key,'owner-one'));
});
test('generator guarantees selected character classes without invalid lengths',()=>{
 for(const length of [12,20,64])for(const symbols of [false,true])for(let i=0;i<40;i++){
  const p=generatePassword(length,symbols);assert.equal(p.length,length);assert.match(p,/[a-z]/);assert.match(p,/[A-Z]/);assert.match(p,/[2-9]/);if(symbols)assert.match(p,/[!@#$%&*+\-=?]/);else assert.match(p,/^[a-zA-Z2-9]+$/);
 }
 for(const invalid of [0,11,65,20.5,NaN])assert.throws(()=>generatePassword(invalid));
});
test('malformed decrypted data is rejected',()=>{
 assert.throws(()=>validateVault({version:2,entries:[]}));
 assert.throws(()=>validateVault({...example,entries:[example.entries[0],example.entries[0]]}));
 assert.throws(()=>validateVault({...example,entries:[{...example.entries[0],password:22}]}));
});
