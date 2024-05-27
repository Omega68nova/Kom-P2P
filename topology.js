//Based on BinaryTree class, origin: https://www.30secondsofcode.org/articles/s/js-data-structures-binary-tree
//
//  -p2pNode: node that simply stores a id, its parent and child nodes.
//  -p2pnodeTree: Stores nodes by id in the way they are in the p2p web, used to update connections in case of sudden failure of a node
class P2PTreeNode {
  constructor(id, parent = null,left = null,right = null) {
    this.id = id;
    this.parent = parent;
    this.left = left;
    this.right = right;
  }


  isLeaf() {
    return this.left === null && this.right === null;
  }
  get hasChildren() {
    return !this.isLeaf();
  }
  get connected() {
    return [this.parent, this.left, this.right];
  }
  isChildOf(id){
    if(this.parent&&this.parent.id===id){
      return true;
    }
    return false;
  }
  isParentOf(id){
    if(this.left&&this.left.id===id||this.right&&this.right.id===id){
      return true;
    }
    return false;
  }
  childrenIDs(){
    let children=[]
    if(this.left)
      children.push(this.left.id);
    if(this.right)
      children.push(this.right.id);
    return children;
  }
  parentID(){
    if(this.parent)
      return this.parent.id;
    return null;
  }
  neighboorIDs(){
    if(this.parent){
      let childIds=this.childrenIDs()
      console.log(childIds);
      childIds.push(this.parent.id)
      console.log(childIds);
      return childIds;
    }
    else return this.childrenIDs();
  }
}
class P2PTreeNodeTree {
  constructor(id, left=null, right=null) {
    this.root = new P2PTreeNode(id,null,left,right);
  }
  *preOrderTraversal(node = this.root) {
    yield node;
    if (node.left) yield* this.preOrderTraversal(node.left);
    if (node.right) yield* this.preOrderTraversal(node.right);
  }
  /**
   * Adds a element to the tree, trying to keep it balanced.
   * @param {*} id Username of the new member.
   * @returns The new node if the operation was succesfull, or null if not.
   */
  insert(id) {
    let queue = [this.root];
    let nextLayerQueue=[];
    let finished = false;
    while (!finished){
      while(queue.length != 0){
        let node=queue.shift();
        if (node.left===null){
          node.left = new P2PTreeNode(id,node);
          return node.left;
        }else{
          nextLayerQueue.push(node.left);
        }
  
        if (node.right===null){
          node.right = new P2PTreeNode(id,node);
          return node.right;
        }else{
          nextLayerQueue.push(node.right);
        }
      }
      if(nextLayerQueue.length===0){
        finished=true;
      }else{
        queue = nextLayerQueue;
        nextLayerQueue = [];
      }
    }
   
    return null;
  }
  /**
   *   If element not found, returns -1, else it returns the position of the in the tree counted layer by layer from left to right:
   *   root, root.left, root.right, root.left.left, root.left.right, root.right.left ... (note that this doesn't count null nodes).
   * @param {*} id Username of the searched member.
   * @returns Position in the tree.
   */
  getPosN(id) {
    let pos= -1;
    let queue = [this.root];
    let nextLayerQueue=[];
    let finished = false;

    while (!finished){
      while(queue.length != 0 &&!finished){
        let node=queue.shift();
        pos+=1;
        if(node.id===id) return pos;
        if (node.left!==null) nextLayerQueue.push(node.left);
        if (node.right!==null) nextLayerQueue.push(node.right);
      }
      if(nextLayerQueue.length===0) finished=true;
      else{
        queue = nextLayerQueue;
        nextLayerQueue = [];
      }
    }
    return -1;
  }


  /**
   * Removes a node from the tree without breaking it.
   * @param {String} id The username of the node.
   */
  remove(id) {
    if(id===this.root.id && this.root.isLeaf()){
      //throw new Error("Can't remove only node in tree!");
      this.root=null;
      return true;
    }
    if(id===this.root.id) {
      this.root=this.replaceNode(this.root);
      return true;
    }
    for (let node of this.preOrderTraversal()) {
      
      if (node.left.id === id) {
        if (!node.left.isLeaf()) {
          node.left=this.replaceNode(node.left);
        }else {node.left=null;}
        return true;
      }
      if (node.right.id === id) {
        if (!node.right.isLeaf()) {
          node.rigth=this.replaceNode(node.right);
        }else {node.right=null;}
        return true;
      }
    }

    return false;
  } 

  /**
   * Deletes a node from the middle of the tree, replacing it with one of its children 
   * if posible and if it has 2 children making one the parent and repeating the 
   * function with the replaced child recursively.
   * @param {P2PTreeNode} node The node that is going to be replaced.
   * @returns {P2PTreeNode} The resulting node. Null if failed to replace.
   */
  replaceNode(node){
    if (node.isLeaf()){
      return null;
    }
    if(node.right==null){
      if (node.parent)
        node.left.parent=node.parent;
      return node.left;
    }
    if(node.left==null){
      if (node.parent)
        node.right.parent=node.parent;
      return node.right;
    }
    node.id=node.left.id;
    node.left=this.replaceNode(node.left);
    return node;
  }
  /**
   * Replaces the past root with a new node of the tree.
   * @param {String} id The name of the node that will replace the root.
   * @returns {P2PTreeNode} The resulting node. Null if failed to replace.
   */
  makeNewRoot(id){
    console.log("MAKING "+id+" ROOT.")
    console.log(this.toObject())
    if(id===this.root.id){

    }else{
      let myPastNode = this.find(id);
      if(!myPastNode){
        return null;
      }
      //let node = this.replaceNode(myPastNode);
      let rootID = this.root.id;
      myPastNode.id= rootID;
      this.root.id = id;
      //if (node){
      //  this.root.id=id;
      //}
      //return node;
      return this.root;
    }
  }
  /**Looks for a node by its id, if it doesnt exist it returns null instead.
   * @param {String} id The id of the node in the chat, without the common part of all members (their username).
   * @returns {P2PTreeNode} If the node is found and
   * @returns {null} If not found.
  */
  find(id) {
    if(!this.root) return null;
    for (let node of this.preOrderTraversal()) {
      if (node.id === id) return node;
    }
    return null;
  }

  /**
   * 
   * @param {Object} object The object that stores the data of the tree.
   */
  fromObject(object){
    this.root=(this.fromObjectRecursive(JSON.parse(JSON.stringify(object)),null));
  }
  fromObjectRecursive(object,parent){
    if(!object||object=={}) return null;
    let node=new P2PTreeNode(object.id);
    node.parent=parent;
    node.left=this.fromObjectRecursive(object.left,node);
    node.right=this.fromObjectRecursive(object.right,node);
    return node;
  }
  /**
   * 
   * @returns {Object} A object with all nodes in the tree stored in order.
   */
  toObject(){
    let node = this.root;
    let object = this.toObjectRecursive(node);
    return object;
  }
  toObjectRecursive(node){
    if(!node){
      return null;
    }
    let object = {'id':node.id,'left':this.toObjectRecursive(node.left),'right': this.toObjectRecursive(node.right)};
    return object;
  }
  display(){
    return this.displayRecursive(this.root,0)
  }
  displayRecursive(node,spaces){
    let left=""
    let right=""
    if (node.left)
      left="<br />"+"|\xa0\xa0\xa0".repeat(spaces)+"∟"+ this.displayRecursive(node.left,spaces+1)
    if (node.right)
      right="<br />"+"|\xa0\xa0\xa0".repeat(spaces)+"∟"+ this.displayRecursive(node.right,spaces+1)
    return node.id+left+right
  }
  /**
   * 
   * @returns {Array<P2PTreeNode>} a list of all nodes ordered by later (ej. root, root.left, root.right, root.left.left, root.left.right, root.right.left...)
   */
  nodeLayeredList() {
    let list = []
    let queue = [this.root];
    let nextLayerQueue=[];
    let finished = false;

    while (!finished){
      while(queue.length != 0 &&!finished){
        let node=queue.shift();
        list.push(node)
        if (node.left!==null) nextLayerQueue.push(node.left);
        if (node.right!==null) nextLayerQueue.push(node.right);
      }
      if(nextLayerQueue.length===0) finished=true;
      else{
        queue = nextLayerQueue;
        nextLayerQueue = [];
      }
    }
    return list;
  }
  /**
   *   If element not found, returns -1, else it returns the position of the in the tree counted layer by layer from left to right:
   *   root, root.left, root.right, root.left.left, root.left.right, root.right.left ... (note that this doesn't count null nodes).
   * @param id Username of the searched member.
   * @returns {Number} Position in the tree.
   */
  getPosN(id) {
    let pos= -1;
    let queue = [this.root];
    let nextLayerQueue=[];
    let finished = false;

    while (!finished){
      while(queue.length != 0 &&!finished){
        let node=queue.shift();
        pos+=1;
        if(node.id===id) return pos;
        if (node.left!==null) nextLayerQueue.push(node.left);
        if (node.right!==null) nextLayerQueue.push(node.right);
      }
      if(nextLayerQueue.length===0) finished=true;
      else{
        queue = nextLayerQueue;
        nextLayerQueue = [];
      }
    }
    return -1;
  }
}
class P2PMeshNode {
  /**
   * 
   * @param {*} id 
   * @param {Array} parents 
   * @param {Array} children 
   */
  constructor(id, parents=[], children=[]) {
    this.id=id;
    this.parents=parents;
    this.children=children;
  }
  isLeaf() {
    return this.children.length===0;
  }
  get hasChildren() {
    return this.children.length>0;
  }
  get connected() {
    return this.parents.concat(this.children);
  }
  isChildOf(id){
    return this.parents.includes(id);
  }
  isParentOf(id){
    return this.children.includes(id);
  }
  childrenIDs(){
    return this.children;
  }
  parentIDs(){
    return this.parents;
  }
  neighboorIDs(){
    return this.parents.concat(this.children);
  }
}
class P2PFullConnectedTopo {
  /**
   * 
   * @param {Array} ids 
   */
  constructor(ids=[]) {
    this.IDs=ids;
  }


  insert(id) {
    this.IDs.push(id);
    return  new P2PMeshNode(id, this.IDs.slice(undefined,-1), []);
 

  }
  /**
   *   If element not found, returns -1, else it returns the position of the in the tree counted layer by layer from left to right:
   *   root, root.left, root.right, root.left.left, root.left.right, root.right.left ... (note that this doesn't count null nodes).
   * @param {*} id Username of the searched member.
   * @returns Position in the tree.
   */
  getPosN(id) {
    return this.IDs.findIndex((id2)=>id2===id);
  }

  /**
   * Removes a node from the tree without breaking it.
   * @param {String} id The username of the node.
   */
  remove(id) {
    let pos = this.getPosN(id);
    let val = this.IDs.splice(pos)
    if(val.length===1)
      return val
    return null
  } 

  /**
   * Replaces a node's id.    
   * @param  id The id that is going to be replaced.
   * @returns The resulting position. -1 if failed to replace.
   */
  replaceNode(id){
    let pos = this.getPosN(id);
    if(pos===-1)return -1;
    this.IDs[pos]=id;
    return new P2PMeshNode(id, this.IDs.slice(undefined,pos), this.IDs.slice(pos+1));
  }
  /**
   * Replaces the past root with another node of the tree.
   * @param {String} id The name of the node that will replace the root.
   * @returns {Number} The postition of the old root, -1 if new root didnt exist.
   */
  makeNewRoot(id){
    console.log("MAKING "+id+" ROOT.")
    let ofPos = this.getPosN(id)
    if(ofPos!==-1){
      let currentRoot = this.IDs[0];
      this.IDs[0]=id;
      this.IDs[ofPos]=currentRoot;
    }
    return  new P2PMeshNode(this.IDs[ofPos], this.IDs.slice(undefined,ofPos), this.IDs.slice(ofPos));
  }
  /**Looks for a node by its id, if it doesnt exist it returns null instead.
   * @param {String} id The id of the node in the chat, without the common part of all members (their username).
   * @returns {Number} The postion of the node, -1 if not in.
  */
  find(id) {
    let pos = this.getPosN(id)
    return new P2PMeshNode(id, this.IDs.slice(undefined,pos), this.IDs.slice(pos+1));
  }

  /**
   * 
   * @param {Object} object The object that stores the data of the tree.
   */
  fromObject(object){
    this.IDs = object[IDs];
  }
  /**
   * 
   * @returns {Object} A object with all nodes in the tree stored in order.
   */
  toObject(){
    return {'IDs':this.IDs}
  }
}
//module.exports = 
export {P2PTreeNode,P2PTreeNodeTree, P2PMeshNode, P2PFullConnectedTopo}