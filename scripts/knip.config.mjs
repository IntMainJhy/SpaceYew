// Keep CLI tools and the child-process document parser in the reachability graph.
export default {
 entry:['integrations/**/*.mjs!','scripts/*.mjs!','src/lib/resume-extract-worker.mjs!'],
 ignoreExportsUsedInFile:true,
};
