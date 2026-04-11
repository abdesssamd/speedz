import servicemanager
import win32event
import win32service
import win32serviceutil

from printer_agent import PrinterAgent, load_config, setup_logging


class FoodDelyvryPrinterService(win32serviceutil.ServiceFramework):
    _svc_name_ = "FoodDelyvryPrinterAgent"
    _svc_display_name_ = "FoodDelyvry Printer Agent"
    _svc_description_ = "Polls FoodDelyvry backend and prints kitchen tickets automatically."

    def __init__(self, args):
        super().__init__(args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)

    def SvcStop(self):
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)

    def SvcDoRun(self):
        servicemanager.LogInfoMsg("FoodDelyvryPrinterAgent started")
        setup_logging()
        agent = PrinterAgent(load_config())
        try:
            agent.loop()
        except Exception as exc:  # pragma: no cover
            servicemanager.LogErrorMsg(str(exc))
            raise


if __name__ == "__main__":
    win32serviceutil.HandleCommandLine(FoodDelyvryPrinterService)
