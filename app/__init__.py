import os
import pkgutil

__path__ = pkgutil.extend_path(__path__, __name__)

_SERVICE_APP = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "apps", "services", "erp_ai_chatbot", "app")
)
if os.path.isdir(_SERVICE_APP) and _SERVICE_APP not in __path__:
    __path__.append(_SERVICE_APP)
