
# Deactivate #
**Deactivate** (or 'unchoose' originally and internally to the code) does the job of marking the node no longer specifically and on its own account appearing in the graph.  

There are two reasons why a node might be in the central graph:

1) it was specifically chosen by the user to appear in the graph (aka **Activated**) either by dropping it into the graph or by having the verb **Activate** applied to it.

2) it was pulled into the graph by some other node at the moment *that* node became **Activated** because at the moment a node is activated it pulls other nodes into the graph with it but they do not become activated themselves, they merely become **Graphed** along with the **Activated** node which pulled them in.  So deactivation merely removes the property of being in the graph on its own account.  If a node is deactivated it would still stay in the graph if it is being held there by a connection to a node which itself is **Activated** and would only leave the graph if it was no longer being held by an **Activated** node.

To see this in action load the **Maria Abdy** dataset, then:

1) **Hide** every **Thing** by clicking the verb and the class in that order. (Leave **Thing** 'expanded' (▼) so it is just the nodes which are merely Things which are affected not the nodes which are instances of the subclasses of Thing).  Note the effects:
* the grey **Thing** nodes are no longer on the shelf
* *Hidden (11)* and *Shelved (26)* in the **Sets** picker

Disengage the verb **Hide** by clicking it once, until it goes off.

2) **Discard** every **Region** by clicking them in that order.  Note the effects:
* the three red **Region** nodes in the discard bin
* *Discarded (3)* and *Shelved (23)* in the **Sets** picker

Disengage the verb **Discard** by clicking it once.

3) **Label** **Person** to make it easier to see what happens next.  Then disengage the **Label** by clicking off.

4) Drag the **Abdy, Maria** node into the graph. Note that her's is now the only **Activated** node.  See  the stats in the **Sets** picker?  *Activated (1)*,  *Graphed (34)* and *Hidden (0)* because the hidden nodes but not the discarded ones have been graphed.

5) Click the **Activate** verb then click any of the other nodes in the graph, such as **London**, it really doesn't matter which.  Note the change in stats shown in the **Sets** picker?  *Activated (2)* is reflected by the dark circles around the **Abdy, Maria** and **London** nodes.
6) Hover over **Abdy, Maria** and note that the cursor (aka bubble) now says **Deactivate** then click on her.  Note the effects:
* **Abdy, Maria** stays in the graph since she is held there by her connection to **London** which, since *it* remains **Activated** is the reason why **Sets** still shows **Graphed (2)**
* **Abdy, Maria** no longer has her black circle
* everything else has been **Shelved (32)** except the **Regions** which are still **Discarded (3)**.
* the previously **Hidden** **Thing** nodes are on the shelf now having forgotten that they'd previously been hidden. *I'm not sure whether I like this behaviour.  An argument could be made for them going back to being hidden because they were never explicitly shelved, they were merely released from the graph when the node that kept them **Graphed** was no longer **Activated**.*


# Shelve #
**Shelve** does the job of sending a node to the shelf, regardless of which set it happens to be in: **Hidden**, **Graphed** or **Discarded**.  Those three *location sets* are the mutually exclusive answers to the question *Where is the node?*  The other **Sets** (**Pinned**, **Activated**, **Labelled** and **Selected**) are essentially flags which are more or less compatible with the *location sets*.  For example, something can be labelled whether it is discarded or graphed. Something can be pinned or activated so long as it is graphed.  Something can be selected regardless of any other set it is in.  Some verbs strip flags off things as they must to keep it all working right.

7) Now drag **England** into the graph.  Note the effects:
* **Activated (2)** and **Graphed (3)**

8) Now drag **Surrey** from the discard bin into the graph (not the shelf) and note the effect:
* **Activated (3)** and **Graphed (4)**

9) Now click the verb **Shelve** and then click **London** and note the effect:
* **Activated (2)** and **Graphed (3)**
* this is different from what happened when



# Retrieve #
