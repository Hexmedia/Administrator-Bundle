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
use Symfony\Component\DependencyInjection\Reference;

class EditModePass implements CompilerPassInterface
{

    /**
     * You can modify the container here before it is dumped to PHP code.
     *
     * @param ContainerBuilder $container
     *
     * @api
     */
    public function process(ContainerBuilder $container)
    {
        if (!$container->hasDefinition('hexmedia_administrator.content')) {
            return;
        }

        $definition = $container->getDefinition("hexmedia_administrator.content");

        $taggedServices = $container->findTaggedServiceIds("hexmedia.content");

        foreach ($taggedServices as $id => $attributes) {
            $definition->addMethodCall(
                'addType',
                array($attributes[0]['alias'], new Reference($id))
            );
        }
    }
}