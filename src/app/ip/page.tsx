import type {Metadata} from 'next';
import {CharacterCompanion} from '@/components/CharacterCompanion';
import {PublicFrame} from '@/components/PublicSite';

export const metadata:Metadata={title:'Leaf traveler · SpaceYew',robots:{index:false,follow:false}};
export default function CompanionPage(){
  return <PublicFrame path={['ip']}><CharacterCompanion/></PublicFrame>;
}
