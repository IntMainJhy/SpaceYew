// Trusted local fixture: creates real single-use challenges without an external mailbox.
import {hash} from '../src/lib/db.mjs';
import {prepareEmailChallenge,activateEmailChallenge} from '../src/lib/email-auth.mjs';
export function verifiedSignup(input){if(input.challenge)return input;const email=input.email||input.username+'@example.com',challenge=prepareEmailChallenge(email,'register','',hash(String(input.invite)));activateEmailChallenge(challenge.id);return{...input,email,challenge:challenge.id,code:challenge.code}}
