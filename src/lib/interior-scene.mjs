export const interiorModels={
 community:'/models/spaceyew-community.glb',
 resources:'/models/spaceyew-resources.glb',
 login:'/models/spaceyew-login.glb',
};

/** Route identity belongs to the backdrop, independent of the shared glass material. */
export function interiorSceneForPath(path=''){
 if(/^\/(?:login|join|reset-password)(?:\/|$)/.test(path))return 'login';
 if(/^\/community(?:\/|$)/.test(path))return 'community';
 return 'resources';
}
