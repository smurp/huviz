
class Mammal
  birth: -> "live"
  look: -> "sideways"  
  mammaries: true
  fur: true
  blood: "warm"
  eats: -> "plants"

class Primate extends Mammal
  speak: -> "ooh ooh"
  eats: -> "everything"

class Rodent extends Mammal
  speak: -> "squeak"
  eats: ->"cheese"

class Carnivore extends Mammal
  eats: -> "meat"
  look: -> "forward"

class Feline extends Carnivore
  speak: -> "meow"  
  pounce: ->
  stalk: ->

class Canine extends Carnivore
  speak: -> "woof"
  wag_tail: ->

(exports ? this).Canine = Canine
(exports ? this).Feline = Feline
(exports ? this).Mammal = Mammal
(exports ? this).Primate = Primate
(exports ? this).Carnivore = Carnivore

