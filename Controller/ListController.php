<?php
/**
 * Created by JetBrains PhpStorm.
 * User: krun
 * Date: 20.09.13
 * Time: 17:53
 * To change this template use File | Settings | File Templates.
 */

namespace Hexmedia\AdministratorBundle\Controller;


use FOS\RestBundle\Controller\Annotations as Rest;
use FOS\RestBundle\Controller\FOSRestController as Controller;

class ListController extends Controller
{

    public function fieldsAction($namespace, $bundle, $controller)
    {

        $className = ucfirst($namespace) . '\\' . ucfirst($bundle) . "Bundle\\Controller\\" . ucfirst($controller) . "Controller";
        $controller = new $className();

        $params = [
            'fields' => [],
            'name' => $controller->getEntityName(),
            'route' => $controller->getMainRoute()
        ];

        foreach ($controller->getFieldsToDisplayOnList() as $name => $options) {
            if (!isset($options['show']) || $options['show'] != false) {
                $params['fields'][] = [
                    'name' => $name,
                    'label' => $options['label'],
                    'sortable' => (isset($options['sortable']) ? ($options['sortable'] ? 'true' : 'false') : 'true'),
                    'type' => (isset($options['type']) ? $options['type'] : (isset($options['format']) ?  ($options['format'] == "timeformat" ? "time" : ($options['format'] == 'bool' ? "bool" : "string")) : "string"))
                ];
            }
        }

        $response = $this->render("HexmediaAdministratorBundle:List:fields.js.twig", $params);
        $response->headers->set("Content-Type", "text/javascript");

        return $response;
    }
}