"""
AegisTrace Connector Registry
──────────────────────────────
New connector = new file. Register it here. Zero changes to existing code.
"""
from .azure_ad import AzureADConnector
from .okta import OktaConnector
from .csv_import import CSVImportConnector

# connector_type → class
CONNECTOR_REGISTRY = {
    "azure_ad": AzureADConnector,
    "okta":     OktaConnector,
    "csv":      CSVImportConnector,
}

__all__ = ["CONNECTOR_REGISTRY", "AzureADConnector", "OktaConnector", "CSVImportConnector"]
