import chai from 'chai';
const { expect } = chai;
import { SortedSet } from '../src/sortedset.js';

describe('SortedSet', () => {
  var verbose = verbose || false;
  function n(a,b){
    if (a == b) return 0;
    if (a < b) return -1;
    return 1;
  }
  function cmp_on_name(a,b){
    if (a.name == b.name) return 0;
    if (a.name < b.name)  return -1;
    return 1;
  }
  function cmp_on_id(a,b){
    if (a.id == b.id) return 0;
    if (a.id < b.id) return -1;
    return 1;
  }
  var a = {id:1},
      b = {id:2},
      c = {id:0},
      d = {id:3},
      stuff = SortedSet(a,b),
      a_d = SortedSet(a,d).sort_on('id'),
      ints = SortedSet(0,1,2,3,4,5,6,7,8,10).sort_on(n),
      even = SortedSet(0,2,4,6,8,10).sort_on(n),
      some_dupes = SortedSet(0,1,2,2,5,7,2,9).sort_on(n),
      a1 = {id:1, name:'Alice'},
      a2 = {id:2, name:'Alice'},
      a3 = {id:3, name:'Alice'},
      a4 = {id:4, name:'Alice'},
      b5 = {id:5, name:'Bob'},
      b6 = {id:6, name:'Bob'},
      dupe_names = SortedSet().sort_on('name');

  it("can compare on id", () => {
    expect(cmp_on_id(a,a)).to.equal(0);
    expect(cmp_on_id(a,b)).to.equal(-1);
    expect(cmp_on_id(b,a)).to.equal(1);
  });
  it("does binary search", () => {
    expect(ints.binary_search(0)).to.equal(0);
    expect(ints.binary_search(4)).to.equal(4);
    expect(ints.binary_search(8)).to.equal(8);
    expect(ints.binary_search(9)).to.equal(-1);
    expect(ints.binary_search(9,true).idx).to.equal(9);
    expect(ints.binary_search(-3)).to.equal(-1);
    expect(even.binary_search(1,true).idx).to.equal(1);
    expect(even.binary_search(3,true).idx).to.equal(2);
    expect(even.binary_search(5,true).idx).to.equal(3);
    expect(even.binary_search(7,true).idx).to.equal(4);
    expect(even.binary_search(9,true).idx).to.equal(5);
    expect(even.binary_search(9)).to.equal(-1);
    expect(even.binary_search(11,true).idx).to.equal(6);
    expect(stuff.binary_search(a)).to.equal(0);
    expect(stuff.binary_search(b)).to.equal(1);
    expect(stuff.binary_search(c)).to.equal(-1);
    expect(stuff.binary_search(d)).to.equal(-1);
    expect(a_d.binary_search(c)).to.equal(-1);
    expect(a_d.binary_search(c,true).idx).to.equal(0);
    expect(a_d.binary_search(b,true).idx).to.equal(1);
    expect(a_d.add(b)).to.equal(1);
    expect(a_d.binary_search(a)).to.equal(0);
    expect(a_d.binary_search(b)).to.equal(1);
    expect(a_d.binary_search(d)).to.equal(2);
  });
  it("can add() items", () => {
    expect(a_d.add(c)).to.equal(0);
    expect(dupe_names.add(a2)).to.equal(0);
    expect(dupe_names.add(a1)).to.equal(0);
    expect(dupe_names.length).to.equal(2);
    expect(dupe_names.roll_call()).to.equal('1, 2');
    expect(dupe_names.binary_search({'name':'Alice'})).to.equal(1);
    expect(dupe_names.add(a4)).to.equal(2);
    expect(dupe_names.length).to.equal(3);
    expect(dupe_names.roll_call()).to.equal('1, 2, 4');
    expect(dupe_names.add(b6)).to.equal(3);
    expect(dupe_names.roll_call()).to.equal('1, 2, 4, 6');
    expect(dupe_names.add(b5)).to.equal(3);
    expect(dupe_names.roll_call()).to.equal('1, 2, 4, 5, 6');
    expect(dupe_names._cmp(b5, b5)).to.equal(0);
    expect(dupe_names._cmp(a4, b5)).to.equal(-1);
    expect(dupe_names._cmp(b5, a4)).to.equal(1);
    expect(dupe_names._cmp(b5, b6)).to.equal(-1);
    expect(dupe_names._cmp(b6, b5)).to.equal(1);
    expect(dupe_names._cmp(b5, a1)).to.equal(1);
    expect(dupe_names.remove(b5).id).to.equal(5);
    expect(dupe_names.remove(a2).id).to.equal(2);
    expect(dupe_names.roll_call()).to.equal('1, 4, 6');
  });
});
