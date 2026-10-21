// Stable category IDs are stored and filtered; labels are translated at the UI boundary.
const categoryLabels={
 engineering:'开发工程',
 design:'界面设计',
 motion:'动效交互',
 testing:'测试排错',
 knowledge:'知识管理',
 agents:'沟通协作',
};
export function catalogCategoryLabel(category=''){
 return Object.hasOwn(categoryLabels,category)?categoryLabels[category]:category;
}
export function catalogEditorUrl(kind,id=''){
 const section=['docs','skills','resources'].includes(kind)?kind:'docs';
 return '/'+section+'?compose=1'+(id?'&edit='+encodeURIComponent(id):'');
}
