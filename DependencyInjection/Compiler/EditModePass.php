<?php
/**
 * Created by JetBrains PhpStorm.
 * User: krun
 * Date: 19.09.13
 * Time: 15:22
 * To change this template use File | Settings | File Templates.
 */

namespace Hexmedia\AdministratorBundle\DependencyInjection\Compiler;


use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;

class EditModePass implements  CompilerPassInterface {

    /**
     * You can modify the container here before it is dumped to PHP code.
     *
     * @param ContainerBuilder $container
     *
     * @api
     */
    public function process(ContainerBuilder $container)
    {

        var_dump("DU{A");
        die();
    }
}