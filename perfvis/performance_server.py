import os
import json

from ryu.app.wsgi import ControllerBase, route, websocket, WebSocketRPCClient
from webob.static import DirectoryApp
from webob import Response

PATH = os.path.dirname(__file__)

# Serving static files
class PerformanceServerController(ControllerBase):
    def __init__(self, req, link, data, **config):
        super(PerformanceServerController, self).__init__(req, link, data, **config)
        path = "%s/html/" % PATH
        self.static_app = DirectoryApp(path)
        self.performance_app = data['performance_app'] 


    """ Required for static topology files """
    @route('topology', '/{filename:.*}')
    def static_handler(self, req, **kwargs):
        if kwargs['filename']:
            req.path_info = kwargs['filename']
        return self.static_app(req)
        
    @websocket('performance','/v1.0/performance/ws')
    def get_performance_ws(self, ws):
        """Creates the websocket link to client"""
        print('new ws client')
        rpc_client = WebSocketRPCClient(ws)
        self.performance_app.rpc_clients.append(rpc_client)
        rpc_client.serve_forever()
        
    @route('performance', '/v1.0/performance/current', methods=['GET'])
    def get_performance(self, req, **kwargs):
        """Responds with the value of _stats"""
        return self._stats(req, **kwargs)
        
    def _stats(self, req, **kwargs):
        """Get any kind of statistics from the network"""
        # return Response(content_type='application/json', body="Received")
        body = json.dumps(self.performance_app.currentstats)
        return Response(content_type='application/json', body=body)
