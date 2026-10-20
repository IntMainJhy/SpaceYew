import test from 'node:test';
import assert from 'node:assert/strict';
import {homeDownload} from '../src/lib/home-download.mjs';

const headers=(agent='',platform='')=>new Headers({'user-agent':agent,...(platform?{'sec-ch-ua-platform':platform}:{})});

test('homepage download matches desktop OS, respects platform hints and keeps mobile/unknown neutral',()=>{
 const mac='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
 const win='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0';
 assert.deepEqual(homeDownload(headers(mac)),{platform:'macos',name:'macOS',available:false,href:'/downloads#download-macos'});
 assert.deepEqual(homeDownload(headers(win)),{platform:'windows',name:'Windows',available:false,href:'/downloads#download-windows'});
 assert.equal(homeDownload(headers(win,'"macOS"')).platform,'macos');
 assert.equal(homeDownload(headers(mac,'"Windows"')).platform,'windows');
 for(const h of[headers(),headers('Mozilla/5.0 (X11; Linux x86_64)','"Linux"'),headers('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile'),headers('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Mobile/15E148'),headers('Mozilla/5.0 (Linux; Android 15)','"Android"')]){
  assert.deepEqual(homeDownload(h),{platform:null,name:'',available:false,href:'/downloads'});
 }
 const releases={macos:{url:'https://releases.example.com/app.dmg'},windows:{url:'https://releases.example.com/app.exe'}};
 assert.equal(homeDownload(headers(mac),releases).href,releases.macos.url);
 assert.equal(homeDownload(headers(win),releases).href,releases.windows.url);
 assert.equal(homeDownload(headers(win),releases).available,true);
 assert.equal(homeDownload(headers(mac),{windows:releases.windows}).href,'/downloads#download-macos');
});
