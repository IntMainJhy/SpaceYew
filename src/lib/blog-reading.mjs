// A reader's appearance preference may recolor the default paper, never an
// author's deliberate palette or locally colored text on that paper.
export function followsSiteAppearance(design){
 if(!design)return true;
 if(design.appearance&&design.appearance!=='original')return false;
 if(design.background&&!/^#fff(?:fff)?$/i.test(design.background))return false;
 if(['textColor','headingColor','linkColor'].some(key=>design.typography?.[key]))return false;
 return !(design.nodes||[]).some(node=>node.style?.background||node.style?.color||Object.values(node.richText||{}).some(runs=>runs.some(run=>run.color)));
}

export const readingFont='Newsreader,"ZCOOL XiaoWei","Songti SC",Georgia,serif';
