create table if not exists quad (
  id integer primary key autoincrement,
  subj varchar(255),
  pred varchar(255),
  obj varchar(255),
  obj_literal text,
  context varchar(255)
);

create table if not exists preface (
  prefix varchar(20),
  uri varchar(255)
);
