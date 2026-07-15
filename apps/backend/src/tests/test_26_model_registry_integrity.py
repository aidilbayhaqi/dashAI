from sqlalchemy import Boolean


def test_finance_balance_sheet_snapshot_boolean_column_maps_cleanly():
    from src.modules.finance.model_finance import FinanceBalanceSheetSnapshot

    column = FinanceBalanceSheetSnapshot.__table__.c.is_balanced

    assert isinstance(column.type, Boolean)
    assert column.nullable is False
