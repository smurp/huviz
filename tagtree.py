import json


class Node(object):
    """
    A tree is a set of children of an unlabelled root node.
    A node is a label and a set of children.
    A set of children is a keyed set of nodes.

    >>> root = Node("","")
    >>> root.am_root()
    True
    >>> bio = root.add("","BIOGRAPHY","Biography")
    >>> root.tag_to_node['BIOGRAPHY'].label
    'Biography'
    >>> root == root.tag_to_node['']
    True
    >>> birth = root.add("BIOGRAPHY","BIRTH","Birth")
    >>> birth.children
    {}
    >>> root.tag_to_node['BIRTH'].label
    'Birth'
    >>> root.children['BIOGRAPHY'].children['BIRTH'].label == 'Birth'
    True
    >>> len(root.tag_to_node.keys())
    3
    >>> sorted(root.tag_to_node.keys())
    ['', 'BIOGRAPHY', 'BIRTH']
    >>> sorted(root.children.keys())
    ['BIOGRAPHY']
    >>> root.as_json(compact=True)
    '{"BIOGRAPHY":["Biography",{"BIRTH":["Birth"]}]}'

    """
    def am_root(self):
        return self.__dict__.has_key('tag_to_node')
    def __init__(self,tag="",label=""):
        self.tag = tag
        self.label = label
        self.children = {}
        if not tag:
            # we are the root node
            self.tag_to_node = {"":self}
    def add(self,parent_tag,tag,label):
        parent_node = self.tag_to_node[parent_tag]
        node = Node(tag,label)
        parent_node.children[tag] = node
        self.tag_to_node[tag] = node
        return node
    def as_tree(self):
        #print self.children
        #return
        out = {}
        for tag,node in self.children.items():
            val = [node.label]
            out[tag] = val
            if node.children:
                val.append(node.as_tree())
        return out
    def as_json(self,pretty=False,compact=False):
        kwargs = {}
        if pretty:
            kwargs = dict(sort_keys=True,indent=4)
        if compact:
            kwargs = dict(separators=(',', ':'))
        return json.dumps(self.as_tree(),**kwargs)

def reconstitute_TagTree(struct,root=None,label="",parent_tag=""):
    """
    >>> tt_str = '{"BIOGRAPHY":["Biography",{"BIRTH":["Birth"]}]}'
    >>> tt = json.loads(tt_str)
    >>> tag_tree = reconstitute_TagTree(tt)
    >>> sorted(tag_tree.tag_to_node.keys())
    ['', 'BIOGRAPHY', 'BIRTH']    

    """
    if not root:
        root = Node()
    for label_n_kids in struct.items():
        label = label_n_kids[0]
        children = label_n_kids[-1]
        if type(children) != dict:
            children = {}
        for tag,node in children.items():
            root.add(parent_tag,tag,label)
            reconstitute_TagTree(node,root,label,tag)
    return root

def load_TagTree(fname):
    """
    >>> ottP_fname = 'orlando_tag_tree_PRETTY.json'
    >>> ottP = load_TagTree(ottP_fname)
    >>> ottP_str = ottP.as_json()
    >>> ottP_str_orig = open(ottP_fname).read()
    >>> ottP_str_orig == ottP_str
    True
    >>> ottP_str


    """
    with open(fname, 'r') as tt:
        tag_tree = json.loads(tt.read())
    return reconstitute_TagTree(tag_tree)


if __name__ == '__main__':
    import doctest
    import sys
    doctest.testmod(verbose = sys.argv[-1] == '-v')
