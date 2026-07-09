# Contributing to DashAI

## Branch

```text
feature/*
fix/*
security/*
docs/*
```

## Pull Request

Pull request wajib menjelaskan:

- tujuan;
- business rule;
- file yang diubah;
- migration;
- event;
- security impact;
- test;
- rollback;
- screenshot bila frontend.

## Commit

Contoh:

```text
feat(sales): add sales order approval
fix(inventory): prevent duplicate reservation
test(finance): cover invoice allocation
docs(architecture): add automation blueprint
```

## Prohibited

- commit `.env`;
- commit backup;
- disable test;
- direct push ke protected main;
- hard-code tenant;
- hard-code tax rate;
- float untuk uang;
- direct cross-module mutation.
