<?php

namespace Hexmedia\AdministratorBundle\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

/**
 * This is the class that validates and merges configuration from your app/config files
 *
 * To learn more see {@link http://symfony.com/doc/current/cookbook/bundles/extension.html#cookbook-bundles-extension-config-class}
 */
class Configuration implements ConfigurationInterface
{

    /**
     * {@inheritDoc}
     */
    public function getConfigTreeBuilder()
    {
        $treeBuilder = new TreeBuilder();
        $rootNode = $treeBuilder->root('hexmedia_administrator');

        $rootNode->
            children()->
                arrayNode("seo")->
                    isRequired()->
                    children()->
                        scalarNode("viewTemplate")->defaultValue("HexmediaAdministratorBundle:Head:seo.html.twig")->end()->
                        scalarNode("defaultTitle")->defaultValue("Hexmedia CMS")->end()->
                        scalarNode("defaultDescription")->end()->
                        scalarNode("defaultKeywords")->end()->
                    end()->
                end()->
                arrayNode("ga")->
                    isRequired()->
                    children()->
                        scalarNode("viewTemplate")->defaultValue("HexmediaAdministratorBundle:Head:ga.html.twig")->end()->
                        scalarNode("code")->isRequired()->end()->
                        scalarNode("domain")->end()->
                    end()->
                end()->
            end();


        return $treeBuilder;
    }

}
