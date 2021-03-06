<?php

namespace Hexmedia\AdministratorBundle;

use Hexmedia\AdministratorBundle\DependencyInjection\Compiler\EditModePass;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\HttpKernel\Bundle\Bundle;

class HexmediaAdministratorBundle extends Bundle {

    public function build(ContainerBuilder $container) {
        parent::build($container);

        $container->addCompilerPass(new EditModePass());
    }

}
